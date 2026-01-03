/**
 * Standalone script to seed only universities into the database
 * Run with: npx ts-node --project tsconfig.seed.json scripts/seed-universities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const italianUniversities = [
  // Bologna (main focus area)
  {
    name: 'University of Bologna',
    city: 'Bologna',
    emailDomains: ['unibo.it', 'studenti.unibo.it', 'studio.unibo.it'],
  },
  {
    name: 'Bologna Business School',
    city: 'Bologna',
    emailDomains: ['bbs.unibo.it'],
  },
  // Rimini area (main focus area)
  {
    name: 'University of Bologna - Rimini Campus',
    city: 'Rimini',
    emailDomains: ['unibo.it', 'studenti.unibo.it', 'studio.unibo.it'],
  },
  // Major Italian Universities
  {
    name: 'Politecnico di Milano',
    city: 'Milan',
    emailDomains: ['polimi.it', 'mail.polimi.it', 'studenti.polimi.it'],
  },
  {
    name: 'University of Milan',
    city: 'Milan',
    emailDomains: ['unimi.it', 'studenti.unimi.it'],
  },
  {
    name: 'Bocconi University',
    city: 'Milan',
    emailDomains: ['unibocconi.it', 'studbocconi.it'],
  },
  {
    name: 'Cattolica del Sacro Cuore',
    city: 'Milan',
    emailDomains: ['unicatt.it', 'studenti.unicatt.it'],
  },
  {
    name: 'Sapienza University of Rome',
    city: 'Rome',
    emailDomains: ['uniroma1.it', 'stud.uniroma1.it'],
  },
  {
    name: 'Roma Tre University',
    city: 'Rome',
    emailDomains: ['uniroma3.it', 'studenti.uniroma3.it'],
  },
  {
    name: 'University of Rome Tor Vergata',
    city: 'Rome',
    emailDomains: ['uniroma2.it', 'studenti.uniroma2.it'],
  },
  {
    name: 'University of Padua',
    city: 'Padua',
    emailDomains: ['unipd.it', 'studenti.unipd.it'],
  },
  {
    name: 'University of Turin',
    city: 'Turin',
    emailDomains: ['unito.it', 'studenti.unito.it'],
  },
  {
    name: 'Politecnico di Torino',
    city: 'Turin',
    emailDomains: ['polito.it', 'studenti.polito.it'],
  },
  {
    name: 'University of Florence',
    city: 'Florence',
    emailDomains: ['unifi.it', 'studenti.unifi.it'],
  },
  {
    name: 'University of Pisa',
    city: 'Pisa',
    emailDomains: ['unipi.it', 'studenti.unipi.it'],
  },
  {
    name: "Ca' Foscari University of Venice",
    city: 'Venice',
    emailDomains: ['unive.it', 'stud.unive.it'],
  },
  {
    name: 'University of Naples Federico II',
    city: 'Naples',
    emailDomains: ['unina.it', 'studenti.unina.it'],
  },
  {
    name: 'University of Genoa',
    city: 'Genoa',
    emailDomains: ['unige.it', 'studenti.unige.it'],
  },
  {
    name: 'University of Pavia',
    city: 'Pavia',
    emailDomains: ['unipv.it', 'studenti.unipv.it'],
  },
  {
    name: 'University of Verona',
    city: 'Verona',
    emailDomains: ['univr.it', 'studenti.univr.it'],
  },
  {
    name: 'University of Trento',
    city: 'Trento',
    emailDomains: ['unitn.it', 'studenti.unitn.it'],
  },
  {
    name: 'University of Modena and Reggio Emilia',
    city: 'Modena',
    emailDomains: ['unimore.it', 'studenti.unimore.it'],
  },
  {
    name: 'University of Ferrara',
    city: 'Ferrara',
    emailDomains: ['unife.it', 'studenti.unife.it'],
  },
  {
    name: 'University of Parma',
    city: 'Parma',
    emailDomains: ['unipr.it', 'studenti.unipr.it'],
  },
  {
    name: 'University of Urbino',
    city: 'Urbino',
    emailDomains: ['uniurb.it', 'studenti.uniurb.it'],
  },
  {
    name: 'Marche Polytechnic University',
    city: 'Ancona',
    emailDomains: ['univpm.it', 'studenti.univpm.it'],
  },
];

async function main() {
  console.log('🌱 Seeding universities...\n');

  // First, verify the table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM universities LIMIT 1`;
  } catch (error: any) {
    console.error('❌ Error: universities table does not exist!');
    console.error('Please run migrations first: npx prisma migrate deploy');
    throw error;
  }

  let created = 0;
  let updated = 0;

  for (const uni of italianUniversities) {
    try {
      const existing = await prisma.university.findFirst({
        where: { name: uni.name },
      });

      if (existing) {
        await prisma.university.update({
          where: { id: existing.id },
          data: {
            city: uni.city,
            emailDomains: uni.emailDomains,
          },
        });
        updated++;
        console.log(`✓ Updated: ${uni.name} (${uni.city})`);
      } else {
        await prisma.university.create({
          data: {
            name: uni.name,
            city: uni.city,
            emailDomains: uni.emailDomains,
          },
        });
        created++;
        console.log(`+ Created: ${uni.name} (${uni.city})`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${uni.name}:`, error.message);
      throw error;
    }
  }

  console.log(`\n✅ Complete! Created: ${created}, Updated: ${updated}, Total: ${italianUniversities.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Error seeding universities:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

