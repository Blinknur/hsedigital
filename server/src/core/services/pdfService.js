import PDFDocument from 'pdfkit';
import { logger } from '../../shared/utils/logger.js';
import { chartService } from './chartService.js';

class PDFService {
  constructor() {
    this.defaultColors = {
      primary: '#1e40af',
      secondary: '#64748b',
      accent: '#0ea5e9',
      text: '#1e293b',
      lightGray: '#f1f5f9',
    };
  }

  async generateAuditReport(auditData, organizationBranding = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: `Audit Report - ${auditData.auditNumber}`,
            Author: organizationBranding.name || 'HSE Digital',
            Subject: 'Audit Report',
            Keywords: 'audit, hse, safety'
          }
        });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const colors = organizationBranding.colors || this.defaultColors;

        await this._addHeader(doc, organizationBranding, colors);
        
        this._addTitle(doc, `Audit Report`, colors);
        this._addSubtitle(doc, auditData.auditNumber, colors);

        doc.moveDown(1);

        this._addSection(doc, 'Audit Information', colors);
        this._addKeyValuePair(doc, 'Station', auditData.station?.name || 'N/A');
        this._addKeyValuePair(doc, 'Auditor', auditData.auditor?.name || 'N/A');
        this._addKeyValuePair(doc, 'Scheduled Date', new Date(auditData.scheduledDate).toLocaleDateString());
        this._addKeyValuePair(doc, 'Status', auditData.status);
        this._addKeyValuePair(doc, 'Overall Score', `${auditData.overallScore}%`);
        
        if (auditData.completedDate) {
          this._addKeyValuePair(doc, 'Completed Date', new Date(auditData.completedDate).toLocaleDateString());
        }

        doc.moveDown(1);

        if (auditData.findings && Array.isArray(auditData.findings) && auditData.findings.length > 0) {
          this._addSection(doc, 'Findings', colors);
          
          auditData.findings.forEach((finding, index) => {
            doc.fontSize(11)
               .fillColor(colors.text)
               .text(`${index + 1}. ${finding.title || finding.description}`, { 
                 width: 495 
               });
            
            if (finding.severity) {
              doc.fontSize(9)
                 .fillColor(this._getSeverityColor(finding.severity))
                 .text(`   Severity: ${finding.severity}`);
            }
            
            if (finding.recommendation) {
              doc.fontSize(9)
                 .fillColor(colors.secondary)
                 .text(`   Recommendation: ${finding.recommendation}`, { width: 485 });
            }
            
            doc.moveDown(0.5);
          });
        }

        if (auditData.charts) {
          doc.addPage();
          this._addSection(doc, 'Visual Analysis', colors);
          
          for (const chart of auditData.charts) {
            try {
              const chartBuffer = await this._generateChart(chart);
              doc.image(chartBuffer, {
                fit: [500, 300],
                align: 'center'
              });
              doc.moveDown(1);
            } catch (error) {
              logger.error({ error, chart }, 'Failed to add chart to PDF');
            }
          }
        }

        this._addFooter(doc, organizationBranding, colors);

        doc.end();
      } catch (error) {
        logger.error({ error }, 'Failed to generate audit PDF');
        reject(error);
      }
    });
  }

  async generateIncidentReport(incidentData, organizationBranding = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: `Incident Report - ${incidentData.id}`,
            Author: organizationBranding.name || 'HSE Digital',
            Subject: 'Incident Report',
            Keywords: 'incident, hse, safety'
          }
        });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const colors = organizationBranding.colors || this.defaultColors;

        await this._addHeader(doc, organizationBranding, colors);
        
        this._addTitle(doc, `Incident Report`, colors);
        this._addSubtitle(doc, `ID: ${incidentData.id}`, colors);

        doc.moveDown(1);

        this._addSection(doc, 'Incident Details', colors);
        this._addKeyValuePair(doc, 'Type', incidentData.incidentType);
        this._addKeyValuePair(doc, 'Severity', incidentData.severity);
        this._addKeyValuePair(doc, 'Status', incidentData.status);
        this._addKeyValuePair(doc, 'Station', incidentData.station?.name || 'N/A');
        this._addKeyValuePair(doc, 'Reporter', incidentData.reporter?.name || 'N/A');
        this._addKeyValuePair(doc, 'Reported At', new Date(incidentData.reportedAt).toLocaleString());
        
        if (incidentData.resolvedAt) {
          this._addKeyValuePair(doc, 'Resolved At', new Date(incidentData.resolvedAt).toLocaleString());
        }

        doc.moveDown(1);

        this._addSection(doc, 'Description', colors);
        doc.fontSize(10)
           .fillColor(colors.text)
           .text(incidentData.description, { align: 'left', width: 495 });

        if (incidentData.charts) {
          doc.addPage();
          this._addSection(doc, 'Analysis', colors);
          
          for (const chart of incidentData.charts) {
            try {
              const chartBuffer = await this._generateChart(chart);
              doc.image(chartBuffer, {
                fit: [500, 300],
                align: 'center'
              });
              doc.moveDown(1);
            } catch (error) {
              logger.error({ error, chart }, 'Failed to add chart to PDF');
            }
          }
        }

        this._addFooter(doc, organizationBranding, colors);

        doc.end();
      } catch (error) {
        logger.error({ error }, 'Failed to generate incident PDF');
        reject(error);
      }
    });
  }

  async generateSummaryReport(summaryData, organizationBranding = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: `Summary Report - ${summaryData.title}`,
            Author: organizationBranding.name || 'HSE Digital',
            Subject: 'Summary Report',
            Keywords: 'summary, hse, safety'
          }
        });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const colors = organizationBranding.colors || this.defaultColors;

        await this._addHeader(doc, organizationBranding, colors);
        
        this._addTitle(doc, summaryData.title || 'Summary Report', colors);
        this._addSubtitle(doc, summaryData.subtitle || '', colors);

        doc.moveDown(1);

        if (summaryData.period) {
          this._addSection(doc, 'Report Period', colors);
          this._addKeyValuePair(doc, 'From', new Date(summaryData.period.from).toLocaleDateString());
          this._addKeyValuePair(doc, 'To', new Date(summaryData.period.to).toLocaleDateString());
          doc.moveDown(1);
        }

        if (summaryData.metrics) {
          this._addSection(doc, 'Key Metrics', colors);
          
          Object.entries(summaryData.metrics).forEach(([key, value]) => {
            this._addKeyValuePair(doc, this._formatLabel(key), value.toString());
          });
          
          doc.moveDown(1);
        }

        if (summaryData.sections) {
          summaryData.sections.forEach(section => {
            this._addSection(doc, section.title, colors);
            
            if (section.content) {
              doc.fontSize(10)
                 .fillColor(colors.text)
                 .text(section.content, { align: 'left', width: 495 });
            }
            
            if (section.items && Array.isArray(section.items)) {
              section.items.forEach(item => {
                doc.fontSize(10)
                   .fillColor(colors.text)
                   .text(`• ${item}`, { indent: 20, width: 475 });
              });
            }
            
            doc.moveDown(1);
          });
        }

        if (summaryData.charts) {
          doc.addPage();
          this._addSection(doc, 'Visual Analysis', colors);
          
          for (const chart of summaryData.charts) {
            try {
              const chartBuffer = await this._generateChart(chart);
              doc.image(chartBuffer, {
                fit: [500, 300],
                align: 'center'
              });
              doc.moveDown(1);
            } catch (error) {
              logger.error({ error, chart }, 'Failed to add chart to PDF');
            }
          }
        }

        this._addFooter(doc, organizationBranding, colors);

        doc.end();
      } catch (error) {
        logger.error({ error }, 'Failed to generate summary PDF');
        reject(error);
      }
    });
  }

  async _addHeader(doc, branding, colors) {
    if (branding.logo) {
      try {
        doc.image(branding.logo, 50, 45, { width: 100 });
      } catch (error) {
        logger.warn({ error }, 'Failed to add logo to PDF');
      }
    }
    
    doc.fontSize(18)
       .fillColor(colors.primary)
       .text(branding.name || 'HSE Digital', 200, 57, { align: 'right' });
    
    doc.moveTo(50, 100)
       .lineTo(545, 100)
       .strokeColor(colors.primary)
       .stroke();
    
    doc.moveDown(2);
  }

  _addFooter(doc, branding, colors) {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .fillColor(colors.secondary)
         .text(
           `Generated by ${branding.name || 'HSE Digital'} | ${new Date().toLocaleDateString()}`,
           50,
           doc.page.height - 50,
           { align: 'center', width: 495 }
         );
      
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 35,
        { align: 'center', width: 495 }
      );
    }
  }

  _addTitle(doc, title, colors) {
    doc.fontSize(20)
       .fillColor(colors.primary)
       .text(title, { align: 'center' });
  }

  _addSubtitle(doc, subtitle, colors) {
    doc.fontSize(12)
       .fillColor(colors.secondary)
       .text(subtitle, { align: 'center' });
  }

  _addSection(doc, title, colors) {
    doc.fontSize(14)
       .fillColor(colors.primary)
       .text(title, { underline: true });
    
    doc.moveDown(0.5);
  }

  _addKeyValuePair(doc, key, value) {
    doc.fontSize(10)
       .fillColor('#374151')
       .text(`${key}: `, { continued: true, bold: true })
       .fillColor('#1e293b')
       .text(value);
  }

  _formatLabel(label) {
    return label
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  _getSeverityColor(severity) {
    const severityColors = {
      'Critical': '#dc2626',
      'High': '#ea580c',
      'Medium': '#d97706',
      'Low': '#65a30d',
    };
    return severityColors[severity] || '#64748b';
  }

  async _generateChart(chartConfig) {
    return await chartService.generateChartImage(chartConfig);
  }
}

export const pdfService = new PDFService();
