import { client, setTokens, loadPersistedTokens, getRefreshToken } from "./client";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  language: string;
  country: string | null;
  authProvider: "email" | "google" | "apple";
  notifyNewReleases: boolean;
  notifyComments: boolean;
  /** ISO string cuando el email fue verificado, null si todavía no. */
  emailVerified: string | null;
}

export interface AuthStats {
  moviesViewed: number;
  tvViewed: number;
  favoritesCount: number;
  ratingsCount: number;
  commentsCount: number;
}

export async function register(email: string, password: string, name?: string): Promise<AuthUser> {
  const res = await client.post("/auth/register", { email, password, name });
  setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
  return res.data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await client.post("/auth/login", { email, password });
  setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
  return res.data.user;
}

/** Se llama al arrancar la app: si hay tokens guardados, valida la sesión contra el backend. */
export async function restoreSession(): Promise<AuthUser | null> {
  const { accessToken, refreshToken } = await loadPersistedTokens();
  if (!accessToken || !refreshToken) return null;
  try {
    const { user } = await getMe();
    return user;
  } catch {
    setTokens(null);
    return null;
  }
}

export async function logout() {
  const refreshToken = getRefreshToken();
  setTokens(null);
  if (refreshToken) {
    // Best-effort: revoca la sesión del lado del servidor. Si falla (sin
    // red, etc.) el logout local ya surtió efecto igual.
    client.post("/auth/logout", { refreshToken }).catch(() => {});
  }
}

export async function getMe(): Promise<{ user: AuthUser; stats: AuthStats }> {
  const res = await client.get("/auth/me");
  return res.data;
}

export async function updateProfile(
  patch: Partial<{
    name: string;
    avatarUrl: string;
    language: string;
    country: string;
    notifyNewReleases: boolean;
    notifyComments: boolean;
  }>
): Promise<AuthUser> {
  const res = await client.patch("/auth/me", patch);
  return res.data.user;
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await client.post("/auth/reset-password", { token, password });
}

/** Verifica el email a partir del token del link (público). */
export async function verifyEmail(token: string): Promise<void> {
  await client.post("/auth/verify-email", { token });
}

/** Reenvía el email de verificación al usuario logueado. */
export async function resendVerification(): Promise<void> {
  await client.post("/auth/resend-verification", {});
}

/** Elimina la cuenta del usuario logueado (borrado en cascada en el backend). */
export async function deleteAccount(): Promise<void> {
  await client.delete("/auth/me");
  setTokens(null);
}

/** Plataformas (tmdbIds) que el usuario declaró tener. */
export async function getMyPlatforms(): Promise<number[]> {
  const res = await client.get("/me/platforms");
  return res.data.platforms || [];
}

export async function setMyPlatforms(platforms: number[]): Promise<number[]> {
  const res = await client.put("/me/platforms", { platforms });
  return res.data.platforms || [];
}
