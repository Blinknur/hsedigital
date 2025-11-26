import { HSEClient } from '../src';

async function main() {
  const client = new HSEClient({
    baseUrl: 'http://localhost:3001',
    maxRetries: 3,
    onTokenRefresh: (tokens) => {
      console.log('Tokens refreshed:', tokens);
    },
  });

  try {
    const loginResult = await client.login({
      email: 'admin@example.com',
      password: 'password123',
    });

    console.log('Logged in as:', loginResult.user.name);

    const stations = await client.listStations();
    console.log(`Found ${stations.length} stations`);

    if (stations.length > 0) {
      const { data: audits } = await client.listAudits({
        stationId: stations[0].id,
        limit: 10,
      });
      console.log(`Found ${audits.length} audits for station ${stations[0].name}`);
    }

    await client.logout();
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
