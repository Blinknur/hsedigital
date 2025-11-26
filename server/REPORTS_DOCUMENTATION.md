# Report Generation Engine Documentation

## Overview

The HSE Digital Report Generation Engine provides comprehensive PDF report creation with the following features:

- **PDF Generation**: Professional PDF reports using PDFKit
- **Chart Visualization**: Embedded charts using Puppeteer + Chart.js
- **Tenant Branding**: Customizable templates with organization-specific branding
- **S3 Storage**: Scalable storage with AWS S3 or local filesystem
- **Scheduled Reports**: Automated report generation via cron expressions
- **Email Delivery**: Automatic report distribution to recipients

## Architecture

### Components

1. **Report Service** (`services/reportService.js`)
   - Data collection from database
   - PDF generation orchestration
   - Storage management

2. **PDF Service** (`services/pdfService.js`)
   - PDF document creation
   - Template rendering
   - Chart embedding

3. **Chart Service** (`services/chartService.js`)
   - Chart generation using Puppeteer
   - Chart.js rendering
   - Image conversion

4. **S3 Service** (`services/s3Service.js`)
   - AWS S3 integration
   - Local filesystem fallback
   - Signed URL generation

5. **Report Scheduler** (`services/reportScheduler.js`)
   - Cron job management
   - Scheduled report execution
   - Email notifications

## Database Schema

### Report
```prisma
model Report {
  id               String    @id @default(cuid())
  organizationId   String
  name             String
  type             String    // 'audit', 'incident', 'audit_summary', 'incident_summary', 'compliance'
  format           String    @default("pdf")
  status           String    @default("pending")  // 'pending', 'processing', 'completed', 'failed'
  filters          Json      @default("{}")
  parameters       Json      @default("{}")
  generatedBy      String?
  scheduledAt      DateTime?
  generatedAt      DateTime?
  fileUrl          String?
  fileKey          String?
  fileSize         Int?
  error            String?
  metadata         Json      @default("{}")
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

### ReportTemplate
```prisma
model ReportTemplate {
  id               String   @id @default(cuid())
  organizationId   String
  name             String
  description      String?
  type             String
  template         Json
  isDefault        Boolean  @default(false)
  branding         Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

### ReportSchedule
```prisma
model ReportSchedule {
  id               String    @id @default(cuid())
  organizationId   String
  name             String
  reportType       String
  cronExpression   String
  filters          Json      @default("{}")
  parameters       Json      @default("{}")
  recipients       String[]
  isActive         Boolean   @default(true)
  lastRunAt        DateTime?
  nextRunAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

## API Endpoints

### Reports

#### GET `/api/reports`
List all reports for the organization.

**Query Parameters:**
- `type`: Filter by report type
- `status`: Filter by status

**Response:**
```json
[
  {
    "id": "report-id",
    "name": "Monthly Audit Report",
    "type": "audit_summary",
    "status": "completed",
    "fileUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST `/api/reports`
Create and generate a new report.

**Request Body:**
```json
{
  "name": "Station Audit Report",
  "type": "audit",
  "filters": {
    "auditId": "audit-123"
  },
  "parameters": {
    "includeCharts": true
  }
}
```

**Response:** `202 Accepted`
```json
{
  "id": "report-id",
  "status": "pending",
  "message": "Report generation started"
}
```

#### GET `/api/reports/:id`
Get report details.

#### GET `/api/reports/:id/download`
Get a signed download URL for the report.

**Response:**
```json
{
  "url": "https://s3.amazonaws.com/..."
}
```

#### DELETE `/api/reports/:id`
Delete a report and its file.

### Report Templates

#### GET `/api/reports/templates/list`
List all templates for the organization.

#### POST `/api/reports/templates`
Create a new report template.

**Request Body:**
```json
{
  "name": "Branded Audit Template",
  "description": "Standard audit report with company branding",
  "type": "audit",
  "template": {},
  "branding": {
    "colors": {
      "primary": "#1e40af",
      "secondary": "#64748b"
    },
    "logo": "https://..."
  },
  "isDefault": true
}
```

#### PUT `/api/reports/templates/:id`
Update a template.

#### DELETE `/api/reports/templates/:id`
Delete a template.

### Report Schedules

#### GET `/api/reports/schedules/list`
List all scheduled reports.

#### POST `/api/reports/schedules`
Create a new report schedule.

**Request Body:**
```json
{
  "name": "Weekly Incident Summary",
  "reportType": "incident_summary",
  "cronExpression": "0 9 * * 1",
  "filters": {},
  "parameters": {
    "includeCharts": true
  },
  "recipients": ["manager@company.com", "safety@company.com"],
  "isActive": true
}
```

**Cron Expression Examples:**
- `0 9 * * *` - Daily at 9 AM
- `0 9 * * 1` - Every Monday at 9 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 9 * * 1-5` - Weekdays at 9 AM

#### PUT `/api/reports/schedules/:id`
Update a schedule.

#### DELETE `/api/reports/schedules/:id`
Delete a schedule.

#### POST `/api/reports/schedules/:id/run`
Manually trigger a scheduled report.

## Report Types

### 1. Audit Report (`audit`)
Individual audit report with findings and recommendations.

**Required Filters:**
```json
{
  "auditId": "audit-123"
}
```

**Parameters:**
```json
{
  "includeCharts": true
}
```

### 2. Incident Report (`incident`)
Individual incident report with details and analysis.

**Required Filters:**
```json
{
  "incidentId": "incident-123"
}
```

### 3. Audit Summary Report (`audit_summary`)
Summary of multiple audits over a period.

**Filters:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-03-31",
  "stationId": "station-123"  // optional
}
```

### 4. Incident Summary Report (`incident_summary`)
Summary of incidents over a period.

**Filters:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-03-31",
  "stationId": "station-123"  // optional
}
```

### 5. Compliance Report (`compliance`)
Compliance status across all stations.

**Filters:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31"
}
```

## Configuration

### Environment Variables

```env
# Storage Configuration
REPORTS_STORAGE_TYPE=s3          # 's3' or 'local'
REPORTS_LOCAL_PATH=./public/reports
REPORT_RETENTION_DAYS=90

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=hse-digital-reports
S3_REPORTS_PREFIX=reports/
```

### Branding Configuration

```json
{
  "name": "Company Name",
  "logo": "https://example.com/logo.png",
  "colors": {
    "primary": "#1e40af",
    "secondary": "#64748b",
    "accent": "#0ea5e9",
    "text": "#1e293b",
    "lightGray": "#f1f5f9"
  }
}
```

## Chart Types

### Bar Chart
```json
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Audits",
      "data": [10, 15, 12]
    }]
  },
  "options": {
    "title": "Monthly Audits"
  }
}
```

### Line Chart
```json
{
  "type": "line",
  "data": {
    "labels": ["Week 1", "Week 2", "Week 3"],
    "datasets": [{
      "label": "Incidents",
      "data": [5, 3, 7]
    }]
  },
  "options": {
    "title": "Weekly Incidents"
  }
}
```

### Pie Chart
```json
{
  "type": "pie",
  "data": {
    "labels": ["Critical", "High", "Medium", "Low"],
    "data": [2, 5, 12, 8]
  },
  "options": {
    "title": "Findings by Severity"
  }
}
```

## Usage Examples

### Generate Audit Report

```javascript
// POST /api/reports
const response = await fetch('/api/reports', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Station A Audit - Q1 2024',
    type: 'audit',
    filters: { auditId: 'audit-123' },
    parameters: { includeCharts: true }
  })
});

const report = await response.json();
console.log('Report ID:', report.id);

// Poll for completion
const checkStatus = setInterval(async () => {
  const status = await fetch(`/api/reports/${report.id}`);
  const data = await status.json();
  
  if (data.status === 'completed') {
    clearInterval(checkStatus);
    console.log('Report ready:', data.fileUrl);
  }
}, 5000);
```

### Schedule Weekly Report

```javascript
// POST /api/reports/schedules
await fetch('/api/reports/schedules', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Weekly Safety Summary',
    reportType: 'incident_summary',
    cronExpression: '0 9 * * 1',  // Every Monday at 9 AM
    filters: {
      dateFrom: 'last_week',  // Special keyword
      dateTo: 'now'
    },
    recipients: [
      'safety@company.com',
      'manager@company.com'
    ],
    isActive: true
  })
});
```

## Performance Considerations

1. **Chart Generation**: Puppeteer launches a headless browser, which is resource-intensive. Consider:
   - Limiting concurrent report generations
   - Using a queue system for high-volume scenarios
   - Caching chart images when possible

2. **PDF Generation**: Large reports with many charts can take time:
   - Generate reports asynchronously
   - Provide status polling endpoints
   - Set appropriate timeout values

3. **Storage**: 
   - Use S3 for production environments
   - Implement retention policies to clean up old reports
   - Consider lifecycle rules in S3

## Troubleshooting

### Puppeteer Issues

If Puppeteer fails to launch:
```bash
# Install required dependencies (Ubuntu/Debian)
sudo apt-get install -y libgbm1 libnss3 libatk-bridge2.0-0 libx11-xcb1

# Or use --no-sandbox flag (already configured)
```

### S3 Connection Issues

```javascript
// Test S3 connection
import { s3Service } from './services/s3Service.js';

const testBuffer = Buffer.from('test');
await s3Service.uploadFile(testBuffer, 'test.txt', 'text/plain');
console.log('S3 connection successful');
```

### Memory Issues

For large reports, increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## Security

1. **File Access**: Generated reports are tenant-isolated
2. **Signed URLs**: S3 URLs expire after 1 hour by default
3. **Authentication**: All endpoints require valid JWT
4. **RBAC**: Can be integrated with permission system

## Future Enhancements

- [ ] Excel/CSV export formats
- [ ] Custom report builders
- [ ] Interactive dashboards
- [ ] Report versioning
- [ ] Webhook notifications
- [ ] Batch report generation
- [ ] Report analytics

## Support

For issues or questions, check the logs:
```bash
# Server logs
tail -f server/logs/app.log

# Report-specific logs
grep "report" server/logs/app.log
```
