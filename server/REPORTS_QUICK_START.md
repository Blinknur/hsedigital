# Report Generation - Quick Start Guide

## 🚀 Features

- ✅ PDF report generation for audits and incidents
- ✅ Chart visualization embedding (bar, line, pie, doughnut)
- ✅ Tenant-specific branding and templates
- ✅ S3 storage with local filesystem fallback
- ✅ Scheduled report generation via cron jobs
- ✅ Email delivery to recipients
- ✅ Async generation with status polling

## 📦 Installation

Dependencies are already added to `package.json`:
- `@aws-sdk/client-s3` - S3 storage
- `@aws-sdk/s3-request-presigner` - Signed URLs
- `pdfkit` - PDF generation
- `puppeteer` - Chart rendering
- `cron` - Scheduled jobs
- `chart.js` - Chart library

```bash
cd server
npm install
```

## ⚙️ Configuration

### 1. Environment Variables

Add to `.env`:
```env
# Report Storage
REPORTS_STORAGE_TYPE=local          # 'local' or 's3'
REPORTS_LOCAL_PATH=./public/reports
REPORT_RETENTION_DAYS=90

# AWS S3 (if using S3 storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
S3_BUCKET_NAME=hse-digital-reports
S3_REPORTS_PREFIX=reports/
```

### 2. Database Migration

Generate Prisma client with new models:
```bash
npx prisma generate
npx prisma db push
```

## 🎯 Quick Usage

### Generate a Report

```bash
# Using curl
curl -X POST http://localhost:3001/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Audit Report",
    "type": "audit_summary",
    "filters": {
      "dateFrom": "2024-01-01",
      "dateTo": "2024-01-31"
    },
    "parameters": {
      "includeCharts": true
    }
  }'
```

### Check Report Status

```bash
curl http://localhost:3001/api/reports/REPORT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Download Report

```bash
curl http://localhost:3001/api/reports/REPORT_ID/download \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Report Types

### 1. Single Audit Report
```json
{
  "type": "audit",
  "filters": { "auditId": "audit-123" },
  "parameters": { "includeCharts": true }
}
```

### 2. Single Incident Report
```json
{
  "type": "incident",
  "filters": { "incidentId": "incident-123" },
  "parameters": { "includeCharts": true }
}
```

### 3. Audit Summary (Period)
```json
{
  "type": "audit_summary",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-03-31",
    "stationId": "station-123"  // optional
  }
}
```

### 4. Incident Summary (Period)
```json
{
  "type": "incident_summary",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-03-31"
  }
}
```

### 5. Compliance Report
```json
{
  "type": "compliance",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31"
  }
}
```

## ⏰ Scheduled Reports

### Create a Schedule

```bash
curl -X POST http://localhost:3001/api/reports/schedules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Incident Summary",
    "reportType": "incident_summary",
    "cronExpression": "0 9 * * 1",
    "filters": {},
    "parameters": { "includeCharts": true },
    "recipients": ["manager@company.com"],
    "isActive": true
  }'
```

### Cron Expression Examples

- `0 9 * * *` - Daily at 9 AM
- `0 9 * * 1` - Every Monday at 9 AM  
- `0 0 1 * *` - First day of month at midnight
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 */6 * * *` - Every 6 hours

## 🎨 Custom Branding

### Create a Branded Template

```bash
curl -X POST http://localhost:3001/api/reports/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Branded Template",
    "type": "audit",
    "template": {},
    "branding": {
      "colors": {
        "primary": "#1e40af",
        "secondary": "#64748b",
        "accent": "#0ea5e9"
      },
      "logo": "https://example.com/logo.png"
    },
    "isDefault": true
  }'
```

## 🧪 Testing

Run the test suite:
```bash
node tests/report-generation.test.js
```

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Create report |
| GET | `/api/reports/:id` | Get report details |
| GET | `/api/reports/:id/download` | Get download URL |
| DELETE | `/api/reports/:id` | Delete report |
| GET | `/api/reports/templates/list` | List templates |
| POST | `/api/reports/templates` | Create template |
| PUT | `/api/reports/templates/:id` | Update template |
| DELETE | `/api/reports/templates/:id` | Delete template |
| GET | `/api/reports/schedules/list` | List schedules |
| POST | `/api/reports/schedules` | Create schedule |
| PUT | `/api/reports/schedules/:id` | Update schedule |
| DELETE | `/api/reports/schedules/:id` | Delete schedule |
| POST | `/api/reports/schedules/:id/run` | Run schedule now |

## 🔍 Troubleshooting

### Puppeteer Issues

If chart generation fails:
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y libgbm1 libnss3 libatk-bridge2.0-0 libx11-xcb1

# Or use Docker (recommended)
docker-compose up
```

### S3 Connection

Test S3 connection:
```javascript
import { s3Service } from './services/s3Service.js';

const test = Buffer.from('test');
await s3Service.uploadFile(test, 'test.txt', 'text/plain');
```

### Memory Issues

Increase Node.js memory for large reports:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## 📚 Full Documentation

See [REPORTS_DOCUMENTATION.md](./REPORTS_DOCUMENTATION.md) for complete API reference and advanced usage.

## 🐛 Debugging

Enable detailed logging:
```env
LOG_LEVEL=debug
```

Check logs:
```bash
# All logs
tail -f logs/app.log

# Report-specific
grep "report" logs/app.log
```

## 🚢 Production Deployment

1. **Use S3 Storage**
   ```env
   REPORTS_STORAGE_TYPE=s3
   ```

2. **Configure Retention**
   - Set S3 lifecycle rules to delete old reports
   - Or run cleanup job periodically

3. **Puppeteer in Docker**
   - Use official Node.js Docker image
   - Install Chromium dependencies in Dockerfile

4. **Queue System**
   - For high-volume scenarios, use Redis/Bull queue
   - Limit concurrent report generations

5. **CDN**
   - Use CloudFront in front of S3
   - Cache signed URLs appropriately

## 💡 Tips

- Reports generate asynchronously - poll status endpoint
- Charts are generated using Puppeteer (requires Chromium)
- Local storage is good for development only
- Use S3 for production to handle scale
- Schedule reports during off-peak hours
- Set appropriate retention policies
