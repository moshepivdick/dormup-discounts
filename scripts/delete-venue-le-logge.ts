/**
 * Script to delete "Osteria Pizzeria Le Logge" venue from the database.
 * 
 * This script will:
 * 1. Find the venue by name
 * 2. Delete all related records (discount uses, views, partner associations)
 * 3. Delete the venue itself
 * 
 * Run with: npx ts-node --project tsconfig.seed.json scripts/delete-venue-le-logge.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const venueName = 'Osteria Pizzeria Le Logge';

  // Find the venue
  const venue = await prisma.venue.findFirst({
    where: { name: venueName },
    include: {
      discountUses: true,
      views: true,
      partner: true,
    },
  });

  if (!venue) {
    console.log(`✅ Venue "${venueName}" not found in database. Nothing to delete.`);
    return;
  }

  console.log(`Found venue: ${venue.name} (ID: ${venue.id})`);
  console.log(`  - Discount uses: ${venue.discountUses.length}`);
  console.log(`  - Views: ${venue.views.length}`);
  console.log(`  - Partner associated: ${venue.partner ? 'Yes' : 'No'}`);

  // Delete related records first (due to foreign key constraints)
  if (venue.discountUses.length > 0) {
    await prisma.discountUse.deleteMany({
      where: { venueId: venue.id },
    });
    console.log(`✅ Deleted ${venue.discountUses.length} discount use records`);
  }

  if (venue.views.length > 0) {
    await prisma.venueView.deleteMany({
      where: { venueId: venue.id },
    });
    console.log(`✅ Deleted ${venue.views.length} venue view records`);
  }

  if (venue.partner) {
    await prisma.partner.delete({
      where: { id: venue.partner.id },
    });
    console.log(`✅ Deleted associated partner record`);
  }

  // Finally, delete the venue
  await prisma.venue.delete({
    where: { id: venue.id },
  });

  console.log(`✅ Successfully deleted venue "${venueName}" and all related records.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Error deleting venue:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

