export default async function globalTeardown() {
  console.log('\n🧹 Running Global Test Teardown...\n');

  const startTime = Date.now();

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const duration = Date.now() - startTime;
    console.log(`✅ Global teardown completed in ${duration}ms\n`);

  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
  }
}
