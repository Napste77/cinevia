import { PrismaClient } from "@prisma/client";
import { TMDB_GENRES } from "../src/data/genres";
import { PLATFORMS } from "../src/data/platforms";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
