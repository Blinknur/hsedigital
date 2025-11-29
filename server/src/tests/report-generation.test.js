import prisma from '../shared/utils/db.js';
import { reportService } from '../core/services/reportService.js';
import { s3Service } from '../core/services/s3Service.js';

const prisma = createTracedPrismaClient();

async function testReportGeneration() {
  console.log('🧪 Testing Report Generation System...\n');

  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('❌ No organization found. Please seed the database first.');
      return;
    }

    console.log(`✅ Found organization: ${org.name}`);

    const audit = await prisma.audit.findFirst({
      where: { organizationId: org.id },
    });

    if (!audit) {
      console.log('⚠️  No audits found. Creating test audit...');
      
      const station = await prisma.station.findFirst({
        where: { organizationId: org.id },
      });

      const user = await prisma.user.findFirst({
        where: { organizationId: org.id },
      });

      if (!station || !user) {
        console.log('❌ Need at least one station and user. Please seed the database.');
        return;
      }

      const newAudit = await prisma.audit.create({
        data: {
          organizationId: org.id,
          stationId: station.id,
          auditorId: user.id,
          auditNumber: `TEST-${Date.now()}`,
          scheduledDate: new Date(),
          status: 'Completed',
          formId: 'test-form',
          findings: [
            {
              title: 'Fire Extinguisher Missing',
              severity: 'High',
              description: 'Fire extinguisher not found in designated location',
              recommendation: 'Install new fire extinguisher immediately'
            },
            {
              title: 'Exit Sign Damaged',
              severity: 'Medium',
              description: 'Exit sign light not functioning',
              recommendation: 'Replace exit sign bulb'
            },
            {
              title: 'First Aid Kit Incomplete',
              severity: 'Low',
              description: 'Some items missing from first aid kit',
              recommendation: 'Restock first aid kit'
            }
          ],
          overallScore: 75,
        },
      });

      console.log(`✅ Created test audit: ${newAudit.auditNumber}`);
    }

    console.log('\n📝 Creating test report...');

    const report = await prisma.report.create({
      data: {
        organizationId: org.id,
        name: 'Test Audit Report',
        type: 'audit',
        format: 'pdf',
        status: 'pending',
        filters: { auditId: audit?.id || (await prisma.audit.findFirst({ where: { organizationId: org.id } })).id },
        parameters: { includeCharts: true },
      },
    });

    console.log(`✅ Report created with ID: ${report.id}`);
    console.log('\n🔄 Generating PDF...');

    const generatedReport = await reportService.generateReport(report.id);

    console.log(`✅ Report generated successfully!`);
    console.log(`   Status: ${generatedReport.status}`);
    console.log(`   File Size: ${(generatedReport.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   File URL: ${generatedReport.fileUrl}`);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testReportGeneration();
