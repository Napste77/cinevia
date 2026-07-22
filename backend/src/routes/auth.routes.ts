import { Router } from "express";
import * as authService from "../services/auth";
import { setUserRegion } from "../services/region";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";

export const authRouter = Router();

function serializeUser(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}

authRouter.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) throw new HttpError(400, "Email y contraseña son obligatorios");

  const { user, accessToken, refreshToken } = await authService.register(
    email,
    password,
    name,
    req.header("user-agent") || undefined
  );
  res.status(201).json({ user: serializeUser(user), accessToken, refreshToken });
});

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, "Email y contraseña son obligatorios");

  const { user, accessToken, refreshToken } = await authService.login(
    email,
    password,
    req.header("user-agent") || undefined
  );
  res.json({ user: serializeUser(user), accessToken, refreshToken });
});

authRouter.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new HttpError(400, "Falta refreshToken");

  const result = await authService.refresh(refreshToken, req.header("user-agent") || undefined);
  res.json({
    user: serializeUser(result.user),
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

authRouter.post("/auth/logout", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await authService.logout(refreshToken);
  res.status(204).end();
});

authRouter.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw new HttpError(400, "Falta el email");

  await authService.requestPasswordReset(email);
  // Mismo mensaje exista o no la cuenta (ver services/auth.ts).
  res.json({ message: "Si el email está registrado, te llegará un link para restablecer tu contraseña." });
});

authRouter.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) throw new HttpError(400, "Faltan datos");

  await authService.resetPassword(token, password);
  res.json({ message: "Contraseña actualizada. Ya podés iniciar sesión." });
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const { user, stats } = await authService.getProfileWithStats(req.userId!);
  res.json({ user: serializeUser(user), stats });
});

authRouter.patch("/auth/me", requireAuth, async (req, res) => {
  const { name, avatarUrl, language, country, notifyNewReleases, notifyComments } = req.body || {};

  if (country) {
    await setUserRegion(req.userId!, country, "manual");
  }

  const user = await authService.updateProfile(req.userId!, {
    ...(name !== undefined ? { name } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    ...(language !== undefined ? { language } : {}),
    ...(notifyNewReleases !== undefined ? { notifyNewReleases } : {}),
    ...(notifyComments !== undefined ? { notifyComments } : {}),
  });

  res.json({ user: serializeUser(user) });
});

/**
 * Google/Apple Sign-In: arquitectura preparada (columnas authProvider/
 * providerId en User, más este endpoint), pero sin credenciales de OAuth
 * configuradas todavía no hay nada real que verificar del lado de Google/
 * Apple — devolver un login simulado sería peor que ser explícitos: 501
 * hasta que se carguen GOOGLE_CLIENT_ID / APPLE_CLIENT_ID.
 */
authRouter.post("/auth/google", async (_req, res) => {
  if (!env.googleClientId) {
    res.status(501).json({ error: "Google Sign-In todavía no está configurado (falta GOOGLE_CLIENT_ID)" });
    return;
  }
  throw new HttpError(501, "Verificación de token de Google pendiente de implementar");
});

authRouter.post("/auth/apple", async (_req, res) => {
  if (!env.appleClientId) {
    res.status(501).json({ error: "Apple Sign-In todavía no está configurado (falta APPLE_CLIENT_ID)" });
    return;
  }
  throw new HttpError(501, "Verificación de token de Apple pendiente de implementar");
});
