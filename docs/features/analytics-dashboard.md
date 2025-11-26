# Business Intelligence & Analytics Dashboard

## Overview

The Analytics Dashboard provides comprehensive business intelligence with KPIs, predictive maintenance insights using ML algorithms, safety trend analysis, station performance comparisons, and customizable report widgets with drill-down capabilities.

## Features

### 1. **Key Performance Indicators (KPIs)**
- **Audit Completion Rate**: Percentage of scheduled audits completed on time
- **Safety Score**: Overall safety performance score based on audit results
- **Average Response Time**: Mean incident resolution time across all severities
- **Critical Incidents**: Count of high-priority safety incidents

### 2. **Safety Trends Analysis**
- Historical incident trends over 6-12 months
- Audit score progression
- Critical incident tracking
- Trend direction (improving/declining/stable) with percentage change

### 3. **Station Performance Comparison**
- Ranking of all stations by performance score
- Top performers highlighting
- Stations needing attention identification
- Drill-down into individual station metrics:
  - Average audit score
  - Total audits completed
  - Incident count
  - Critical incidents
  - Risk category

### 4. **Predictive Maintenance Insights (ML-Powered)**
Uses machine learning algorithms to predict maintenance needs based on:
- **Historical audit scores**: Declining trends indicate increasing risk
- **Incident patterns**: Frequency and type of maintenance-related incidents
- **Equipment age**: Time since last audit/maintenance
- **Risk scoring**: Composite score from multiple factors

**Prediction Output:**
- Risk score (0-100)
- Confidence level (percentage)
- Predicted date for required maintenance
- Priority level (Critical/High/Medium/Low)
- Specific predicted issues
- Actionable recommendations

**ML Algorithm Logic:**
```
Risk Score Calculation:
- Low audit scores (<70): +30 points, (<80): +15 points
- Declining audit trend (>10 point drop): +25 points
- High recent incidents (>5 in 90 days): +20 points
- Maintenance-related incidents (>2): +25 points
- Audit overdue (>180 days): +15 points

Confidence = min(95, Risk Score + 20)
Priority = Critical (>70), High (>50), Medium (>30)
```

### 5. **Incident Response Times**
- Average response time by severity level
- Comparison against target SLAs:
  - Critical: 4 hours
  - High: 12 hours
  - Medium: 24 hours
  - Low: 48 hours
- Performance status indicators (On Target/Delayed/Critical)

### 6. **Customizable Widget Dashboard**
Users can create personalized dashboard layouts by:
- Adding/removing widgets
- Showing/hiding widgets
- Configuring widget settings
- Arranging widgets in custom layouts

**Available Widget Types:**
- KPI Cards
- Safety Trends Chart
- Station Performance Table
- Predictive Maintenance Alerts
- Incident Response Timeline
- Audit Completion Gauge

## API Endpoints

### Get Dashboard Data
```
GET /api/analytics/dashboard-data?period=30d
```
Returns complete dashboard data including KPIs, trends, station performance, and predictions.

**Query Parameters:**
- `period`: Time period (7d, 30d, 90d, 1y)

**Response:**
```json
{
  "period": { "start": "2024-01-01", "end": "2024-01-31" },
  "kpis": {
    "auditCompletionRate": 85.5,
    "incidentResponseTimes": {
      "average": 18.5,
      "bySeverity": {
        "Critical": 3.2,
        "High": 10.5,
        "Medium": 22.1,
        "Low": 45.3
      },
      "total": 42
    },
    "safetyScore": 87.3,
    "totalIncidents": 42,
    "openIncidents": 5,
    "criticalIncidents": 2,
    "topPerformingStations": 5,
    "stationsNeedingAttention": 3
  },
  "safetyTrends": { ... },
  "stationPerformance": { ... },
  "predictiveMaintenance": { ... }
}
```

### Get KPIs
```
GET /api/analytics/kpis?period=30d
```

### Get Safety Trends
```
GET /api/analytics/safety-trends?periods=12
```

### Get Station Performance
```
GET /api/analytics/station-performance?period=30d
```

### Get Predictive Maintenance
```
GET /api/analytics/predictive-maintenance
```
Analyzes all stations and generates ML-powered predictions for maintenance needs.

### Widget Management

#### List Widgets
```
GET /api/analytics/widgets
```

#### Create Widget
```
POST /api/analytics/widgets
Body: {
  "widgetType": "kpi",
  "title": "My KPI",
  "config": {},
  "position": { "x": 0, "y": 0, "w": 4, "h": 3 }
}
```

#### Update Widget
```
PUT /api/analytics/widgets/:id
Body: {
  "title": "Updated Title",
  "config": { ... },
  "position": { ... },
  "isVisible": true
}
```

#### Delete Widget
```
DELETE /api/analytics/widgets/:id
```

### Export Data
```
GET /api/analytics/export?format=json&period=30d
GET /api/analytics/export?format=csv&period=30d
```

## Database Schema

### AnalyticsSnapshot
Stores periodic snapshots of analytics data for historical analysis.

```prisma
model AnalyticsSnapshot {
  id             String   @id @default(cuid())
  organizationId String
  snapshotDate   DateTime
  metrics        Json
  kpis           Json
  trends         Json
  predictions    Json?
  createdAt      DateTime @default(now())
}
```

### DashboardWidget
Stores user-customized dashboard widget configurations.

```prisma
model DashboardWidget {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  widgetType     String
  title          String
  config         Json
  position       Json
  isVisible      Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### MaintenanceAlert
Stores ML-generated predictive maintenance alerts.

```prisma
model MaintenanceAlert {
  id             String   @id @default(cuid())
  organizationId String
  stationId      String
  alertType      String
  priority       String
  message        String
  predictedDate  DateTime?
  confidence     Float?
  isResolved     Boolean  @default(false)
  resolvedAt     DateTime?
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## Usage

### Frontend Integration

```tsx
import BIDashboard from '@/components/dashboards/BIDashboard';

function App() {
  return <BIDashboard />;
}
```

### Accessing Analytics Service (Backend)

```javascript
import analyticsService from './services/analyticsService.js';

// Generate KPIs
const kpis = await analyticsService.generateKPIs(
  organizationId,
  startDate,
  endDate
);

// Get predictive maintenance
const predictions = await analyticsService.predictMaintenanceNeeds(
  organizationId
);

// Analyze safety trends
const trends = await analyticsService.analyzeSafetyTrends(
  organizationId,
  12 // periods
);

// Compare station performance
const performance = await analyticsService.compareStationPerformance(
  organizationId,
  startDate,
  endDate
);
```

## Permissions

Analytics features require the following permission:
- `analytics:read` - View analytics and dashboards
- `analytics:write` - Manage custom widgets

## Performance Considerations

1. **Caching**: Dashboard data is cached for 5 minutes by default
2. **Pagination**: Large datasets are paginated automatically
3. **Async Processing**: ML predictions run asynchronously
4. **Indexing**: Database indices on key fields (organizationId, stationId, date fields)

## Future Enhancements

- [ ] Real-time dashboard updates via WebSocket
- [ ] Advanced ML models for more accurate predictions
- [ ] Anomaly detection algorithms
- [ ] Custom alert thresholds
- [ ] Scheduled report generation
- [ ] Integration with external BI tools
- [ ] Mobile-responsive dashboard
- [ ] Export to PDF reports
- [ ] Comparative benchmarking across organizations
- [ ] Time-series forecasting for trends

## Troubleshooting

### Dashboard not loading
- Check authentication token
- Verify analytics permission
- Check browser console for errors

### Predictions not showing
- Ensure stations have sufficient historical data (minimum 3 audits)
- Check for recent incidents in the last 90 days
- Verify database connectivity

### Performance issues
- Reduce time period for large datasets
- Clear widget cache
- Optimize database queries with appropriate indices

## Support

For issues or questions, contact the development team or refer to the main documentation.
