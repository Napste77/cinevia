import axios from "axios";
import { env } from "../config/env";

/**
 * Detección de país por IP (server-side, nunca pide permiso de
 * geolocalización GPS al usuario). ip-api.com: gratis, sin API key,
 * suficiente para "país aproximado" — no para ubicación precisa.
 * Si falla o la IP es local/no pública (dev), devuelve null y el caller
 * cae al país por defecto.
 */
export async function detectCountryByIp(ip: string): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null;

  try {
    const res = await axios.get(`${env.geoIpBaseUrl}/${ip}`, {
      params: { fields: "status,countryCode" },
      timeout: 4000,
    });
    if (res.data?.status === "success" && res.data?.countryCode) {
      return String(res.data.countryCode).toUpperCase();
    }
    return null;
  } catch (e) {
    console.error("Error detectando país por IP:", (e as any)?.message || e);
    return null;
  }
}

function isPrivateIp(ip: string) {
  const normalized = ip.replace("::ffff:", "");
  return (
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}
