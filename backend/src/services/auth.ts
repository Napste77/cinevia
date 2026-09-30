import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../utils/passwords";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "../utils/jwt";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(userId: number, userAgent?: string): Promise<AuthTokens> {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: userAgent?.slice(0, 255),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name?: string, userAgent?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) throw new HttpError(400, "Email inválido");
  if (password.length < 8) throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new HttpError(409, "Ya existe una cuenta con ese email");

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      name: name?.trim() || null,
      authProvider: "email",
    },
  });

  const tokens = await issueTokens(user.id, userAgent);

  // Manda el email de verificación (best-effort: si Resend falla o tarda,
  // el registro ya se completó igual — el usuario puede pedir reenvío).
  sendEmailVerification(user.id, user.email, user.name).catch(() => {});

  return { user, ...tokens };
}

/**
 * Genera un token de verificación (opaco, se guarda solo su hash) y manda
 * el link por email. Se usa al registrarse y en el reenvío manual.
 */
async function sendEmailVerification(userId: number, email: string, name?: string | null): Promise<void> {
  const token = generateEmailVerificationToken();
  const expiresAt = new Date(Date.now() + env.emailVerificationTtlHours * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashEmailVerificationToken(token), expiresAt },
  });
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  await sendVerificationEmail(email, verifyUrl, name);
}

/** Consume el token (una sola vez, si no venció) y marca el email como verificado. */
export async function verifyEmail(token: string): Promise<void> {
  if (!token) throw new HttpError(400, "Falta el token");
  const tokenHash = hashEmailVerificationToken(token);
  const row = await prisma.emailVerificationToken.findFirst({ where: { tokenHash } });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new HttpError(400, "El link de verificación es inválido o venció. Pedí uno nuevo.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
}

/** Reenvía el email de verificación al usuario logueado (si todavía no verificó). */
export async function resendVerification(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  if (user.emailVerified) return; // ya verificado, nada que reenviar
  await sendEmailVerification(user.id, user.email, user.name);
}

/**
 * Elimina la cuenta y TODOS sus datos. El borrado en cascada (onDelete:
 * Cascade en el schema) se lleva sesiones, favoritos, vistos, ratings,
 * comentarios, listas, regiones, tokens y plataformas del usuario.
 */
export async function deleteAccount(userId: number): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function login(email: string, password: string, userAgent?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) throw new HttpError(401, "Email o contraseña incorrectos");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new HttpError(401, "Email o contraseña incorrectos");

  const tokens = await issueTokens(user.id, userAgent);
  return { user, ...tokens };
}

export async function refresh(refreshToken: string, userAgent?: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.userSession.findFirst({ where: { refreshTokenHash: tokenHash } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new HttpError(401, "Sesión inválida o vencida");
  }

  // Rotación: se revoca la sesión vieja y se emite un par nuevo — si un
  // refresh token robado se usa después de que el dueño ya rotó el suyo,
  // esto lo detecta (la sesión ya estaría revocada) en vez de dejarlo vivo.
  await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  const tokens = await issueTokens(session.userId, userAgent);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  return { user, ...tokens };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.userSession.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfileWithStats(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "Usuario no encontrado");

  const [moviesViewed, tvViewed, favoritesCount, ratingsCount, commentsCount] = await Promise.all([
    prisma.userView.count({ where: { userId, contentType: "movie" } }),
    prisma.userView.count({ where: { userId, contentType: "tv" } }),
    prisma.userFavorite.count({ where: { userId } }),
    prisma.userRating.count({ where: { userId } }),
    prisma.userComment.count({ where: { userId } }),
  ]);

  return {
    user,
    stats: {
      moviesViewed,
      tvViewed,
      favoritesCount,
      ratingsCount,
      commentsCount,
    },
  };
}

export async function updateProfile(
  userId: number,
  patch: { name?: string; avatarUrl?: string; language?: string; notifyNewReleases?: boolean; notifyComments?: boolean }
) {
  return prisma.user.update({ where: { id: userId }, data: patch });
}

/**
 * "Olvidé mi contraseña": genera un token opaco, guarda solo su hash con
 * vencimiento (PasswordResetToken), y manda el link por email.
 *
 * Siempre responde éxito aunque el email no exista — devolver 404 acá es
 * un enumeration bug clásico (permite a cualquiera confirmar qué emails
 * están registrados probando uno por uno).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Cuentas de Google/Apple (sin passwordHash propia) no tienen contraseña
  // que resetear — no hay nada que mandar, pero tampoco se revela nada.
  if (!user || !user.passwordHash) return;

  const token = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashPasswordResetToken(token), expiresAt },
  });

  const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl, env.passwordResetTokenTtlMinutes);
}

/** Consume el token (una sola vez, si no venció) y setea la contraseña nueva. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!token) throw new HttpError(400, "Falta el token");
  if (newPassword.length < 8) throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new HttpError(400, "El link para restablecer la contraseña es inválido o venció. Pedí uno nuevo.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Por seguridad: al resetear la contraseña se cierran todas las
    // sesiones activas (mismo criterio que un cambio de contraseña en
    // cualquier plataforma seria — si alguien más tenía acceso, se corta).
    prisma.userSession.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
