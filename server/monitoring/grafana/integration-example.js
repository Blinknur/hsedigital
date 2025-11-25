import { trackFeatureUsage, updateTenantMetrics, updateConcurrentUsers, trackCacheOperation, trackDatabaseOperation, updateQuotaUsage } from '../../services/tenantMetrics.js';

/**
 * Example integrations for feature tracking and metrics collection
 * 
 * Add these calls to your route handlers to track feature usage and metrics
 */

// ============================================
// AUDIT MANAGEMENT EXAMPLES
// ============================================

export const auditCreateExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    // Your audit creation logic here
    const audit = await prisma.audit.create({
      data: req.body
    });
    
    // Track feature usage
    trackFeatureUsage(organizationId, 'audit_create', 'create');
    
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const auditCompleteExample = async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  
  try {
    const audit = await prisma.audit.update({
      where: { id },
      data: { status: 'Completed', completedDate: new Date() }
    });
    
    // Track audit completion
    trackFeatureUsage(organizationId, 'audit_complete', 'update');
    
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const auditViewExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const audits = await prisma.audit.findMany({
      where: { organizationId }
    });
    
    // Track audit viewing
    trackFeatureUsage(organizationId, 'audit_view', 'read');
    trackDatabaseOperation(organizationId, 'read');
    
    res.json(audits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// INCIDENT MANAGEMENT EXAMPLES
// ============================================

export const incidentCreateExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const incident = await prisma.incident.create({
      data: req.body
    });
    
    // Track incident creation
    trackFeatureUsage(organizationId, 'incident_create', 'create');
    trackDatabaseOperation(organizationId, 'write');
    
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const incidentResolveExample = async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  
  try {
    const incident = await prisma.incident.update({
      where: { id },
      data: { status: 'Resolved', resolvedDate: new Date() }
    });
    
    // Track incident resolution
    trackFeatureUsage(organizationId, 'incident_resolve', 'update');
    
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// STATION MANAGEMENT EXAMPLES
// ============================================

export const stationCreateExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const station = await prisma.station.create({
      data: { ...req.body, organizationId }
    });
    
    // Track station creation
    trackFeatureUsage(organizationId, 'station_create', 'create');
    
    // Update tenant metrics
    await updateTenantMetrics(organizationId);
    
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const stationUpdateExample = async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  
  try {
    const station = await prisma.station.update({
      where: { id },
      data: req.body
    });
    
    // Track station management
    trackFeatureUsage(organizationId, 'station_manage', 'update');
    
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// CONTRACTOR MANAGEMENT EXAMPLES
// ============================================

export const contractorCreateExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const contractor = await prisma.contractor.create({
      data: { ...req.body, organizationId }
    });
    
    // Track contractor creation
    trackFeatureUsage(organizationId, 'contractor_create', 'create');
    
    res.json(contractor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const contractorManageExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const contractors = await prisma.contractor.findMany({
      where: { organizationId }
    });
    
    // Track contractor management
    trackFeatureUsage(organizationId, 'contractor_manage', 'read');
    
    res.json(contractors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// USER SESSION TRACKING
// ============================================

export const trackUserLoginExample = (req, res, next) => {
  const { organizationId, id: userId } = req.user;
  
  // Track active user sessions
  // This would typically be tracked in Redis with expiration
  trackFeatureUsage(organizationId, 'user_login', 'auth');
  
  next();
};

export const updateConcurrentUsersExample = async (organizationId, activeUsers) => {
  // Update concurrent users count
  updateConcurrentUsers(organizationId, activeUsers.length);
};

// ============================================
// CACHE OPERATION TRACKING
// ============================================

export const cacheGetExample = async (organizationId, key) => {
  try {
    const value = await redis.get(key);
    
    if (value) {
      trackCacheOperation(organizationId, 'hit');
    } else {
      trackCacheOperation(organizationId, 'miss');
    }
    
    return value;
  } catch (error) {
    trackCacheOperation(organizationId, 'error');
    throw error;
  }
};

export const cacheSetExample = async (organizationId, key, value) => {
  try {
    await redis.set(key, value);
    trackCacheOperation(organizationId, 'set');
  } catch (error) {
    trackCacheOperation(organizationId, 'error');
    throw error;
  }
};

// ============================================
// QUOTA TRACKING
// ============================================

export const checkApiQuotaExample = async (req, res, next) => {
  const { organizationId } = req.user;
  
  try {
    // Get current usage
    const usage = await getUsageStats(organizationId);
    
    // Update quota metrics
    await updateQuotaUsage(organizationId, 'api_calls', usage.apiCalls, usage.limits.apiCalls);
    await updateQuotaUsage(organizationId, 'storage', usage.storage, usage.limits.storage);
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// REPORT GENERATION TRACKING
// ============================================

export const generateReportExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    // Your report generation logic
    const report = await generateReport(req.body);
    
    // Track report generation
    trackFeatureUsage(organizationId, 'report_generate', 'create');
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// EXPORT FUNCTIONALITY TRACKING
// ============================================

export const exportDataExample = async (req, res) => {
  const { organizationId } = req.user;
  const { format } = req.query;
  
  try {
    // Your export logic
    const data = await exportData(organizationId, format);
    
    // Track export usage
    trackFeatureUsage(organizationId, `export_${format}`, 'export');
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// DASHBOARD VIEW TRACKING
// ============================================

export const dashboardViewExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    // Your dashboard logic
    const dashboardData = await getDashboardData(organizationId);
    
    // Track dashboard views
    trackFeatureUsage(organizationId, 'dashboard_view', 'read');
    
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// FORM DEFINITION MANAGEMENT
// ============================================

export const formCreateExample = async (req, res) => {
  const { organizationId } = req.user;
  
  try {
    const form = await prisma.formDefinition.create({
      data: { ...req.body, organizationId }
    });
    
    // Track form creation
    trackFeatureUsage(organizationId, 'form_create', 'create');
    
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  auditCreateExample,
  auditCompleteExample,
  auditViewExample,
  incidentCreateExample,
  incidentResolveExample,
  stationCreateExample,
  stationUpdateExample,
  contractorCreateExample,
  contractorManageExample,
  trackUserLoginExample,
  updateConcurrentUsersExample,
  cacheGetExample,
  cacheSetExample,
  checkApiQuotaExample,
  generateReportExample,
  exportDataExample,
  dashboardViewExample,
  formCreateExample
};
