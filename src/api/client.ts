import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Cliente HTTP compartido por TODO el frontend (contenido y cuentas):
 * agrega el Bearer token automáticamente si hay sesión, y si un request
 * vuelve 401 por token vencido, refresca una sola vez (aunque disparen
 * varios requests en paralelo) y reintenta antes de rendirse.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";
const ACCESS_TOKEN_KEY = "nowsee:accessToken";
const REFRESH_TOKEN_KEY = "nowsee:refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const client = axios.create({ baseURL: BASE_URL });

export function setTokens(tokens: { accessToken: string; refreshToken: string } | null) {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;
  if (tokens) {
    AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, tokens.accessToken],
      [REFRESH_TOKEN_KEY, tokens.refreshToken],
    ]).catch(() => {});
  } else {
    AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]).catch(() => {});
  }
}

export async function loadPersistedTokens() {
  const pairs = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  accessToken = pairs[0][1];
  refreshToken = pairs[1][1];
  return { accessToken, refreshToken };
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function isLoggedIn() {
  return !!accessToken;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    (config.headers as any) = { ...config.headers, Authorization: `Bearer ${accessToken}` };
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        return res.data.accessToken as string;
      })
      .catch(() => {
        setTokens(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && refreshToken && !original?._retriedAfterRefresh) {
      if (original) original._retriedAfterRefresh = true;
      const newToken = await refreshAccessToken();
      if (newToken && original) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return client(original);
      }
    }
    return Promise.reject(error);
  }
);
