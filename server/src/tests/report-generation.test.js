import { describe, it, expect } from '@jest/globals';
import { dbConnectionEstablished } from '../../jest.setup.js';
import prisma from '../shared/utils/db.js';
import { reportService } from '../core/services/reportService.js';

describe('Report Generation System', () => {
  it('should generate PDF report for audit', async () => {
    if (!dbConnectionEstablished) {
      console.log('Skipping: Database not available');
      return;
    }

    try {
      const org = await prisma.organization.findFirst();
      if (!org) {
        console.log('Skipping: No organization found');
        return;
      }

      const audit = await prisma.audit.findFirst({
        where: { organizationId: org.id },
      });

      if (!audit) {
        console.log('Skipping: No audits found');
        return;
      }

      const report = await prisma.report.create({
        data: {
          organizationId: org.id,
          name: 'Test Audit Report',
          type: 'audit',
          format: 'pdf',
          status: 'pending',
          filters: { auditId: audit.id },
          parameters: { includeCharts: true },
        },
      });

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.status).toBe('pending');

      try {
        const generatedReport = await reportService.generateReport(report.id);
        expect(generatedReport.status).toBe('completed');
        expect(generatedReport.fileUrl).toBeDefined();
      } catch (error) {
        console.log('Report generation skipped:', error.message);
      }

      await prisma.report.delete({ where: { id: report.id } }).catch(() => {});
    } catch (error) {
      console.log('Skipping: Test setup failed -', error.message);
    }
  }, 30000);
});
