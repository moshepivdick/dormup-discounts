/**
 * Script to remove universities that are not in the approved list
 * Run with: npx ts-node --project tsconfig.seed.json scripts/cleanup-universities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Approved list of universities to keep
const APPROVED_UNIVERSITIES = [
  'University of Bologna',
  'University of Milan',
  'University of Parma',
  'University of Turin',
  'Sapienza University of Rome',
  'University of Naples Federico II',
  'Politecnico di Milano',
  'University of Verona',
  'University of Pisa',
];

async function main() {
  console.log('🧹 Cleaning up universities...\n');

  try {
    // Get all universities from database
    const allUniversities = await prisma.university.findMany({
      include: {
        profiles: true,
        requests: true,
      },
      orderBy: { name: 'asc' },
    });

    console.log(`📊 Found ${allUniversities.length} universities in database\n`);

    // Find universities to keep and to remove
    const universitiesToKeep = allUniversities.filter((uni) =>
      APPROVED_UNIVERSITIES.includes(uni.name)
    );
    const universitiesToRemove = allUniversities.filter(
      (uni) => !APPROVED_UNIVERSITIES.includes(uni.name)
    );

    console.log(`✅ Universities to keep: ${universitiesToKeep.length}`);
    universitiesToKeep.forEach((uni) => {
      console.log(`   - ${uni.name} (${uni.city})`);
    });

    console.log(`\n❌ Universities to remove: ${universitiesToRemove.length}`);
    if (universitiesToRemove.length === 0) {
      console.log('   No universities to remove. Database is already clean!');
      return;
    }

    universitiesToRemove.forEach((uni) => {
      console.log(
        `   - ${uni.name} (${uni.city}) - Profiles: ${uni.profiles.length}, Requests: ${uni.requests.length}`
      );
    });

    // Check if any universities to remove have profiles
    const universitiesWithProfiles = universitiesToRemove.filter(
      (uni) => uni.profiles.length > 0
    );

    if (universitiesWithProfiles.length > 0) {
      console.log(`\n⚠️  Warning: ${universitiesWithProfiles.length} universities have associated profiles:`);
      universitiesWithProfiles.forEach((uni) => {
        console.log(
          `   - ${uni.name}: ${uni.profiles.length} profile(s)`
        );
      });

      // Get the default university (University of Bologna) to reassign profiles
      const defaultUniversity = universitiesToKeep.find(
        (uni) => uni.name === 'University of Bologna'
      );

      if (!defaultUniversity) {
        console.error(
          '\n❌ Error: University of Bologna not found! Cannot reassign profiles.'
        );
        process.exit(1);
      }

      console.log(
        `\n🔄 Reassigning profiles to "${defaultUniversity.name}"...`
      );

      // Reassign profiles to University of Bologna
      for (const uni of universitiesWithProfiles) {
        const updatedCount = await prisma.profile.updateMany({
          where: { university_id: uni.id },
          data: { university_id: defaultUniversity.id },
        });
        console.log(
          `   ✓ Reassigned ${updatedCount.count} profile(s) from "${uni.name}" to "${defaultUniversity.name}"`
        );
      }
    }

    // Check if any universities to remove have requests
    const universitiesWithRequests = universitiesToRemove.filter(
      (uni) => uni.requests.length > 0
    );

    if (universitiesWithRequests.length > 0) {
      console.log(`\n📝 Note: ${universitiesWithRequests.length} universities have associated requests:`);
      universitiesWithRequests.forEach((uni) => {
        console.log(`   - ${uni.name}: ${uni.requests.length} request(s)`);
      });
      console.log('   Requests will be preserved, but university_id will be set to NULL');
    }

    // Remove universities (requests will have university_id set to null due to ON DELETE SET NULL or similar)
    console.log('\n🗑️  Deleting universities...');
    let deletedCount = 0;
    for (const uni of universitiesToRemove) {
      try {
        // First, unlink requests
        await prisma.universityRequest.updateMany({
          where: { universityId: uni.id },
          data: { universityId: null },
        });

        // Then delete the university
        await prisma.university.delete({
          where: { id: uni.id },
        });
        deletedCount++;
        console.log(`   ✓ Deleted: ${uni.name}`);
      } catch (error: any) {
        console.error(`   ❌ Error deleting ${uni.name}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} universities.`);
    console.log(`📊 Remaining universities: ${universitiesToKeep.length}`);
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
