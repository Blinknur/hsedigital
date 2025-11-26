import { createTracedPrismaClient } from '../utils/tracedPrismaClient.js';
import { logger } from '../utils/logger.js';
import { pdfService } from './pdfService.js';
import { s3Service } from './s3Service.js';
import { sendEmail } from './tracedEmailService.js';

const prisma = createTracedPrismaClient();

class ReportService {
  async generateReport(reportId) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { organization: true },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    try {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'processing' },
      });

      const data = await this._collectReportData(report);
      const branding = await this._getOrganizationBranding(report.organizationId);
      const pdfBuffer = await this._generatePDF(report.type, data, branding);

      const key = `${report.organizationId}/${report.type}/${Date.now()}-${report.id}.pdf`;
      const uploadResult = await s3Service.uploadFile(pdfBuffer, key, 'application/pdf', {
        reportId: report.id,
        organizationId: report.organizationId,
        type: report.type,
      });

      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'completed',
          fileUrl: uploadResult.url,
          fileKey: uploadResult.key,
          fileSize: uploadResult.size,
          generatedAt: new Date(),
        },
      });

      logger.info({ reportId, key: uploadResult.key }, 'Report generated successfully');
      return updatedReport;
    } catch (error) {
      logger.error({ error, reportId }, 'Failed to generate report');
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'failed', error: error.message },
      });
      throw error;
    }
  }

  async _collectReportData(report) {
    const { type, filters, parameters, organizationId } = report;
    switch (type) {
      case 'audit':
        return await this._collectAuditData(organizationId, filters, parameters);
      case 'incident':
        return await this._collectIncidentData(organizationId, filters, parameters);
      case 'audit_summary':
        return await this._collectAuditSummaryData(organizationId, filters, parameters);
      case 'incident_summary':
        return await this._collectIncidentSummaryData(organizationId, filters, parameters);
      case 'compliance':
        return await this._collectComplianceData(organizationId, filters, parameters);
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
  }

  async _collectAuditData(organizationId, filters, parameters) {
    const auditId = filters.auditId || parameters.auditId;
    const audit = await prisma.audit.findFirst({
      where: { id: auditId, organizationId },
      include: {
        station: true,
        auditor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!audit) throw new Error('Audit not found');

    const charts = [];
    if (parameters.includeCharts && audit.findings && Array.isArray(audit.findings)) {
      const severityCounts = audit.findings.reduce((acc, finding) => {
        const severity = finding.severity || 'Unknown';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      if (Object.keys(severityCounts).length > 0) {
        charts.push({
          type: 'pie',
          data: { labels: Object.keys(severityCounts), data: Object.values(severityCounts) },
          options: { title: 'Findings by Severity' },
        });
      }
    }

    return { ...audit, charts };
  }

  async _collectIncidentData(organizationId, filters, parameters) {
    const incidentId = filters.incidentId || parameters.incidentId;
    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, organizationId },
      include: {
        station: true,
        reporter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!incident) throw new Error('Incident not found');

    const charts = [];
    if (parameters.includeCharts) {
      const relatedIncidents = await prisma.incident.findMany({
        where: {
          organizationId,
          stationId: incident.stationId,
          createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });

      const typeCounts = relatedIncidents.reduce((acc, inc) => {
        acc[inc.incidentType] = (acc[inc.incidentType] || 0) + 1;
        return acc;
      }, {});

      if (Object.keys(typeCounts).length > 0) {
        charts.push({
          type: 'bar',
          data: {
            labels: Object.keys(typeCounts),
            datasets: [{ label: 'Incidents by Type', data: Object.values(typeCounts) }],
          },
          options: { title: 'Incident Types at Station (Past Year)' },
        });
      }
    }

    return { ...incident, charts };
  }

  async _collectAuditSummaryData(organizationId, filters, parameters) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    const where = { organizationId, createdAt: { gte: dateFrom, lte: dateTo } };
    if (filters.stationId) where.stationId = filters.stationId;

    const audits = await prisma.audit.findMany({
      where,
      include: { station: true, auditor: { select: { id: true, name: true } } },
      orderBy: { scheduledDate: 'desc' },
    });

    const totalAudits = audits.length;
    const completedAudits = audits.filter(a => a.status === 'Completed').length;
    const averageScore = totalAudits > 0 ? audits.reduce((sum, a) => sum + a.overallScore, 0) / totalAudits : 0;

    const statusCounts = audits.reduce((acc, audit) => {
      acc[audit.status] = (acc[audit.status] || 0) + 1;
      return acc;
    }, {});

    const charts = [];
    if (Object.keys(statusCounts).length > 0) {
      charts.push({
        type: 'doughnut',
        data: { labels: Object.keys(statusCounts), data: Object.values(statusCounts) },
        options: { title: 'Audits by Status' },
      });
    }

    return {
      title: 'Audit Summary Report',
      subtitle: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
      period: { from: dateFrom, to: dateTo },
      metrics: {
        totalAudits,
        completedAudits,
        averageScore: averageScore.toFixed(2),
        completionRate: totalAudits > 0 ? ((completedAudits / totalAudits) * 100).toFixed(1) + '%' : '0%',
      },
      sections: [{
        title: 'Overview',
        content: `This report covers ${totalAudits} audits conducted between ${dateFrom.toLocaleDateString()} and ${dateTo.toLocaleDateString()}.`,
      }],
      charts,
    };
  }

  async _collectIncidentSummaryData(organizationId, filters, parameters) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    const where = { organizationId, createdAt: { gte: dateFrom, lte: dateTo } };
    if (filters.stationId) where.stationId = filters.stationId;

    const incidents = await prisma.incident.findMany({
      where,
      include: { station: true, reporter: { select: { id: true, name: true } } },
      orderBy: { reportedAt: 'desc' },
    });

    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
    const openIncidents = incidents.filter(i => i.status === 'Open').length;

    const severityCounts = incidents.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1;
      return acc;
    }, {});

    const charts = [];
    if (Object.keys(severityCounts).length > 0) {
      charts.push({
        type: 'pie',
        data: { labels: Object.keys(severityCounts), data: Object.values(severityCounts) },
        options: { title: 'Incidents by Severity' },
      });
    }

    return {
      title: 'Incident Summary Report',
      subtitle: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
      period: { from: dateFrom, to: dateTo },
      metrics: { totalIncidents, resolvedIncidents, openIncidents },
      sections: [{
        title: 'Overview',
        content: `This report covers ${totalIncidents} incidents reported between ${dateFrom.toLocaleDateString()} and ${dateTo.toLocaleDateString()}.`,
      }],
      charts,
    };
  }

  async _collectComplianceData(organizationId, filters, parameters) {
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    const audits = await prisma.audit.findMany({
      where: { organizationId, completedDate: { gte: dateFrom, lte: dateTo, not: null } },
      include: { station: true },
    });

    const stations = await prisma.station.findMany({ where: { organizationId } });
    const totalStations = stations.length;
    const auditedStations = new Set(audits.map(a => a.stationId)).size;
    const avgScore = audits.length > 0 ? audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length : 0;

    return {
      title: 'Compliance Report',
      subtitle: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
      period: { from: dateFrom, to: dateTo },
      metrics: {
        totalStations,
        auditedStations,
        coverageRate: totalStations > 0 ? ((auditedStations / totalStations) * 100).toFixed(1) + '%' : '0%',
        averageScore: avgScore.toFixed(2),
      },
      sections: [{
        title: 'Compliance Overview',
        content: `${auditedStations} out of ${totalStations} stations have been audited during this period.`,
      }],
      charts: [],
    };
  }

  async _getOrganizationBranding(organizationId) {
    const template = await prisma.reportTemplate.findFirst({
      where: { organizationId, isDefault: true },
    });

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });

    if (template && template.branding) {
      return { name: org?.name, ...template.branding };
    }

    return {
      name: org?.name || 'HSE Digital',
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#0ea5e9',
        text: '#1e293b',
        lightGray: '#f1f5f9',
      },
    };
  }

  async _generatePDF(type, data, branding) {
    switch (type) {
      case 'audit':
        return await pdfService.generateAuditReport(data, branding);
      case 'incident':
        return await pdfService.generateIncidentReport(data, branding);
      case 'audit_summary':
      case 'incident_summary':
      case 'compliance':
        return await pdfService.generateSummaryReport(data, branding);
      default:
        throw new Error(`Unsupported PDF type: ${type}`);
    }
  }
}

export const reportService = new ReportService();
