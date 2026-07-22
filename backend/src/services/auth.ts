import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../utils/passwords";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "../utils/jwt";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./email";

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

  // Best-effort y no bloqueante: si Resend falla o tarda, el registro ya
  // se completó igual (ver services/email.ts — nunca tira).
  sendWelcomeEmail(user.email, user.name).catch(() => {});

  return { user, ...tokens };
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
