export interface HSEClientConfig {
  baseUrl?: string;
  accessToken?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onTokenRefresh?: (tokens: AuthTokens) => void | Promise<void>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  region?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  subscriptionPlan: 'free' | 'professional' | 'enterprise';
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Station {
  id: string;
  organizationId: string;
  name: string;
  brand?: string;
  region?: string;
  address?: string;
  riskCategory?: 'Low' | 'Medium' | 'High' | 'Critical';
  auditFrequency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Audit {
  id: string;
  organizationId: string;
  stationId: string;
  auditorId: string;
  auditNumber: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  formId: string;
  findings: any[];
  overallScore: number;
  station?: Station;
  auditor?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  organizationId: string;
  stationId: string;
  reporterId: string;
  incidentType: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  reportedAt: string;
  resolvedAt?: string;
  station?: Station;
  reporter?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: string;
  organizationId: string;
  name: string;
  licenseNumber?: string;
  specialization?: string;
  contactPerson?: string;
  email?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkPermit {
  id: string;
  organizationId: string;
  stationId: string;
  requestedBy: string;
  permitType: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  validFrom: string;
  validTo: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface APIError {
  error: string;
  details?: any[];
  code?: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface CreateStationRequest {
  name: string;
  brand?: string;
  region?: string;
  address?: string;
  riskCategory?: string;
  auditFrequency?: string;
}

export interface UpdateStationRequest {
  name?: string;
  brand?: string;
  region?: string;
  address?: string;
  riskCategory?: string;
  auditFrequency?: string;
}

export interface CreateAuditRequest {
  stationId: string;
  auditorId: string;
  scheduledDate: string;
  formId: string;
  status?: string;
}

export interface UpdateAuditRequest {
  status?: string;
  findings?: any[];
  overallScore?: number;
  completedDate?: string;
}

export interface CreateIncidentRequest {
  stationId: string;
  incidentType: string;
  severity: string;
  description: string;
  status?: string;
}

export interface UpdateIncidentRequest {
  incidentType?: string;
  severity?: string;
  description?: string;
  status?: string;
}

export interface ListStationsParams {
  region?: string;
}

export interface ListAuditsParams extends PaginationParams {
  stationId?: string;
  auditorId?: string;
  status?: string;
}

export interface ListIncidentsParams extends PaginationParams {
  stationId?: string;
  severity?: string;
  status?: string;
}
