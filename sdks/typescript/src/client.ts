import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import {
  HSEClientConfig,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  Station,
  CreateStationRequest,
  UpdateStationRequest,
  ListStationsParams,
  Audit,
  CreateAuditRequest,
  UpdateAuditRequest,
  ListAuditsParams,
  PaginatedResponse,
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  ListIncidentsParams,
  Contractor,
  WorkPermit,
  User,
  Organization,
  APIError,
} from './types';

export class HSEClient {
  private client: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;
  private config: Required<Omit<HSEClientConfig, 'accessToken' | 'onTokenRefresh'>> & Pick<HSEClientConfig, 'onTokenRefresh'>;

  constructor(config: HSEClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3001',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      onTokenRefresh: config.onTokenRefresh,
    };

    this.accessToken = config.accessToken;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    axiosRetry(this.client, {
      retries: this.config.maxRetries,
      retryDelay: (retryCount) => {
        return retryCount * this.config.retryDelay;
      },
      retryCondition: (error: AxiosError) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429 ||
               (error.response?.status || 0) >= 500;
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<APIError>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;

          try {
            const tokens = await this.refreshAccessToken();
            this.setTokens(tokens);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (this.config.onTokenRefresh) {
      void this.config.onTokenRefresh(tokens);
    }
  }

  clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
  }

  async signup(data: SignupRequest): Promise<LoginResponse & { organization: Organization }> {
    const response = await this.client.post('/api/auth/signup-with-org', data);
    const tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
    this.setTokens(tokens);
    return response.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post('/api/auth/login', data);
    const tokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
    this.setTokens(tokens);
    return response.data;
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      await this.client.post('/api/auth/logout', { refreshToken: this.refreshToken });
    }
    this.clearTokens();
  }

  async refreshAccessToken(): Promise<AuthTokens> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/api/auth/refresh', {
      refreshToken: this.refreshToken,
    });

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  }

  async listStations(params?: ListStationsParams): Promise<Station[]> {
    const response = await this.client.get('/api/stations', { params });
    return response.data;
  }

  async createStation(data: CreateStationRequest): Promise<Station> {
    const response = await this.client.post('/api/stations', data);
    return response.data;
  }

  async updateStation(id: string, data: UpdateStationRequest): Promise<Station> {
    const response = await this.client.put(`/api/stations/${id}`, data);
    return response.data;
  }

  async deleteStation(id: string): Promise<void> {
    await this.client.delete(`/api/stations/${id}`);
  }

  async listAudits(params?: ListAuditsParams): Promise<PaginatedResponse<Audit>> {
    const response = await this.client.get('/api/audits', { params });
    return {
      data: response.data.audits,
      pagination: response.data.pagination,
    };
  }

  async getAudit(id: string): Promise<Audit> {
    const response = await this.client.get(`/api/audits/${id}`);
    return response.data;
  }

  async createAudit(data: CreateAuditRequest): Promise<Audit> {
    const response = await this.client.post('/api/audits', data);
    return response.data;
  }

  async updateAudit(id: string, data: UpdateAuditRequest): Promise<Audit> {
    const response = await this.client.put(`/api/audits/${id}`, data);
    return response.data;
  }

  async deleteAudit(id: string): Promise<void> {
    await this.client.delete(`/api/audits/${id}`);
  }

  async listIncidents(params?: ListIncidentsParams): Promise<PaginatedResponse<Incident>> {
    const response = await this.client.get('/api/incidents', { params });
    return {
      data: response.data.incidents,
      pagination: response.data.pagination,
    };
  }

  async getIncident(id: string): Promise<Incident> {
    const response = await this.client.get(`/api/incidents/${id}`);
    return response.data;
  }

  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    const response = await this.client.post('/api/incidents', data);
    return response.data;
  }

  async updateIncident(id: string, data: UpdateIncidentRequest): Promise<Incident> {
    const response = await this.client.put(`/api/incidents/${id}`, data);
    return response.data;
  }

  async deleteIncident(id: string): Promise<void> {
    await this.client.delete(`/api/incidents/${id}`);
  }

  async listContractors(): Promise<Contractor[]> {
    const response = await this.client.get('/api/contractors');
    return response.data;
  }

  async listWorkPermits(params?: { stationId?: string }): Promise<WorkPermit[]> {
    const response = await this.client.get('/api/work-permits', { params });
    return response.data;
  }

  async listUsers(): Promise<User[]> {
    const response = await this.client.get('/api/users');
    return response.data;
  }

  async getCurrentUsage(): Promise<any> {
    const response = await this.client.get('/api/usage/current');
    return response.data;
  }
}

export default HSEClient;
