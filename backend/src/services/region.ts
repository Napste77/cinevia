import { prisma } from "../db/prisma";
import { RegionSource } from "@prisma/client";
import { detectCountryByIp } from "../providers/geoip";
import { COUNTRIES } from "../data/countries";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";

const SUPPORTED_COUNTRIES = new Set(COUNTRIES.map((c) => c.code));

export function isSupportedCountry(code: string) {
  return SUPPORTED_COUNTRIES.has(code);
}

export function listCountries() {
  return COUNTRIES;
}

/** País aproximado por IP, con fallback al país por defecto del backend. */
export async function detectRegionForIp(ip: string): Promise<string> {
  const detected = await detectCountryByIp(ip);
  if (detected && isSupportedCountry(detected)) return detected;
  return env.defaultCountry;
}

/**
 * Fija la región activa del usuario logueado y deja registro en el
 * historial (detectada al ingresar, o cambiada a mano desde el perfil).
 */
export async function setUserRegion(userId: number, country: string, source: RegionSource) {
  if (!isSupportedCountry(country)) throw new HttpError(400, `País no soportado: ${country}`);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { country } }),
    prisma.userRegion.create({ data: { userId, country, source } }),
  ]);
}
