import { HSEClient } from '../src';

async function main() {
  const client = new HSEClient({
    baseUrl: 'http://localhost:3001',
  });

  await client.login({
    email: 'admin@example.com',
    password: 'password123',
  });

  const station = await client.createStation({
    name: 'Alpha Station',
    brand: 'Shell',
    region: 'North',
    address: '123 Industrial Rd',
    riskCategory: 'High',
    auditFrequency: 'Monthly',
  });
  console.log('Created station:', station);

  const audit = await client.createAudit({
    stationId: station.id,
    auditorId: 'user-id',
    scheduledDate: new Date().toISOString(),
    formId: 'form-id',
  });
  console.log('Created audit:', audit);

  const incident = await client.createIncident({
    stationId: station.id,
    incidentType: 'Safety Violation',
    severity: 'Medium',
    description: 'Minor safety equipment issue detected',
  });
  console.log('Created incident:', incident);

  const updatedIncident = await client.updateIncident(incident.id, {
    status: 'In Progress',
  });
  console.log('Updated incident:', updatedIncident);
}

main().catch(console.error);
