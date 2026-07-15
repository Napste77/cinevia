import { PrismaClient } from "@prisma/client";
import { TMDB_GENRES } from "../src/data/genres";
import { PLATFORMS } from "../src/data/platforms";
import { COUNTRIES, PLATFORM_AVAILABILITY } from "../src/data/countries";

const prisma = new PrismaClient();

async function main() {
  for (const g of TMDB_GENRES) {
    await prisma.genre.upsert({
      where: { tmdbId: g.tmdbId },
      update: { name: g.name },
      create: { tmdbId: g.tmdbId, name: g.name },
    });
  }
  console.log(`Géneros seedeados: ${TMDB_GENRES.length}`);

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
  console.log(`Plataformas seedeadas: ${PLATFORMS.length}`);

  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
  console.log(`Países seedeados: ${COUNTRIES.length}`);

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
  console.log(`Disponibilidad plataforma×país seedeada: ${availabilityCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
