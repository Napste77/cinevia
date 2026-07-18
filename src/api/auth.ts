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
