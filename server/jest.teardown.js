export default async function globalTeardown() {
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const activeHandles = process._getActiveHandles?.() || [];
      const activeRequests = process._getActiveRequests?.() || [];
      
      if (activeHandles.length === 0 && activeRequests.length === 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });

  if (global.prisma) {
    try {
      await global.prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting Prisma in global teardown:', error.message);
    }
  }

  const activeTimers = setTimeout(() => {}, 0);
  clearTimeout(activeTimers);
}
