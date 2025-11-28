import { cleanupTestData, seedTestData } from './seed-test-data.js';
import { getTestPrisma } from '../helpers/db.helpers.js';

const prisma = getTestPrisma();

async function refreshTestData() {
  console.log('🔄 Refreshing test data...\n');

  try {
    await prisma.$connect();
    
    await cleanupTestData();
    console.log('');
    await seedTestData();
    
    console.log('\n🎉 Test data refresh completed successfully!');
  } catch (error) {
    console.error('\n❌ Test data refresh failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refreshTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default refreshTestData;
