import { prisma } from "../db/prisma";
import { TMDB_GENRES } from "../data/genres";
import { PLATFORMS } from "../data/platforms";
import { COUNTRIES, PLATFORM_AVAILABILITY } from "../data/countries";

/**
 * Catálogo fijo (géneros, plataformas, países, disponibilidad por país):
 * todo vía upsert, así correrlo de nuevo (o en cada arranque, o disparado
 * a mano una sola vez en producción vía POST /internal/seed) nunca
 * duplica ni pisa datos que ya sincronizó un job.
 */
export async function runSeed() {
  for (const g of TMDB_GENRES) {
    await prisma.genre.upsert({
      where: { tmdbId: g.tmdbId },
      update: { name: g.name },
      create: { tmdbId: g.tmdbId, name: g.name },
    });
  }

  for (const p of PLATFORMS) {
    await prisma.platform.upsert({
      where: { slug: p.slug },
      update: { name: p.name, color: p.color, website: p.webBaseUrl, tmdbId: p.tmdbId },
      create: {
        slug: p.slug,
        name: p.name,
        color: p.color,
        website: p.webBaseUrl,
        tmdbId: p.tmdbId,
      },
    });
  }

  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }

  let availabilityCount = 0;
  for (const [slug, countryCodes] of Object.entries(PLATFORM_AVAILABILITY)) {
    const platform = await prisma.platform.findUnique({ where: { slug } });
    if (!platform) continue;
    for (const code of countryCodes) {
      const country = await prisma.country.findUnique({ where: { code } });
      if (!country) continue;
      await prisma.platformAvailability.upsert({
        where: { platformId_countryId: { platformId: platform.id, countryId: country.id } },
        update: {},
        create: { platformId: platform.id, countryId: country.id },
      });
      availabilityCount++;
    }
  }

  return {
    genres: TMDB_GENRES.length,
    platforms: PLATFORMS.length,
    countries: COUNTRIES.length,
    availability: availabilityCount,
  };
}
