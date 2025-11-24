
import {
    MOCK_USERS, MOCK_STATIONS, MOCK_FORM_DEFINITIONS, MOCK_SUBMISSIONS, MOCK_INCIDENTS, MOCK_AUDITS, MOCK_ORGANIZATIONS, MOCK_PERMITS, MOCK_ACTIVITY_LOGS, MOCK_CONTRACTORS
} from '../data/mockData';
import { Organization, User, Station, FormDefinition, ChecklistSubmission, Incident, Audit, PermitToWork, ActivityLogEntry, Contractor, Vector, UserRole } from '../types';
import { client } from './client';

// CONFIGURATION
// Set to false to use the Real Backend
const USE_MOCK = false; 
const API_LATENCY = 300;
const STORAGE_PREFIX = 'HSE_SAAS_V1_';

// --- Persistence Layer Helpers ---
const getStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const loadFromStorage = <T>(key: string, defaultData: T): T => {
    try {
        const stored = localStorage.getItem(getStorageKey(key));
        if (stored) {
            return JSON.parse(stored, (key, value) => {
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                    return new Date(value);
                }
                return value;
            });
        }
    } catch (e) { console.error(`Failed to load ${key}`, e); }
    saveToStorage(key, defaultData);
    return defaultData;
};
const saveToStorage = <T>(key: string, data: T): void => {
    try { localStorage.setItem(getStorageKey(key), JSON.stringify(data)); } catch (e) { console.error(`Failed to save ${key}`, e); }
};

// --- State Initialization (Fallback for Mock) ---
let _organizations: Organization[] = [], _users: User[] = [], _stations: Station[] = [], _forms: FormDefinition[] = [], _submissions: ChecklistSubmission[] = [], _incidents: Incident[] = [], _audits: Audit[] = [], _permits: PermitToWork[] = [], _logs: ActivityLogEntry[] = [], _contractors: Contractor[] = [], _vectors: Vector[] = [];

const initializeData = () => {
    if (_organizations.length > 0) return;
    _organizations = loadFromStorage('ORGANIZATIONS', MOCK_ORGANIZATIONS);
    _users = loadFromStorage('USERS', MOCK_USERS);
    _stations = loadFromStorage('STATIONS', MOCK_STATIONS);
    _forms = loadFromStorage('FORMS', MOCK_FORM_DEFINITIONS);
    _submissions = loadFromStorage('SUBMISSIONS', MOCK_SUBMISSIONS);
    _incidents = loadFromStorage('INCIDENTS', MOCK_INCIDENTS);
    _audits = loadFromStorage('AUDITS', MOCK_AUDITS);
    _permits = loadFromStorage('PERMITS', MOCK_PERMITS);
    _logs = loadFromStorage('LOGS', MOCK_ACTIVITY_LOGS);
    _contractors = loadFromStorage('CONTRACTORS', MOCK_CONTRACTORS);
    _vectors = loadFromStorage('VECTORS', []);
};

if (USE_MOCK) initializeData();

const simulateFetch = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), API_LATENCY));

export const resetSystemData = () => {
    Object.keys(localStorage).forEach(key => { if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key); });
    window.location.reload();
};

export const exportSystemData = () => JSON.stringify({ organizations: _organizations, users: _users, stations: _stations, forms: _forms, submissions: _submissions, incidents: _incidents, audits: _audits, permits: _permits, logs: _logs, contractors: _contractors, vectors: _vectors }, null, 2);

// --- Authentication ---
export const login = async (email: string, password: string = 'password'): Promise<{ accessToken: string, refreshToken: string, user: User }> => {
    try {
        return await client.post<{ accessToken: string, refreshToken: string, user: User }>('/auth/login', { email, password });
    } catch (error) {
        if (USE_MOCK) {
             initializeData(); // Ensure mock data is ready
             let user = _users.find(u => u.email.toLowerCase() === email.toLowerCase());
             if (!user) {
                 user = { id: `user-demo-${Date.now()}`, email, name: email.split('@')[0] || 'Demo User', role: UserRole.Admin, organizationId: _organizations[0]?.id };
                 _users.push(user); saveToStorage('USERS', _users);
             }
             return { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', user };
        }
        throw error;
    }
}

export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // Use relative path for production compatibility
    const uploadUrl = (import.meta as any).env.PROD ? '/api/upload' : 'http://localhost:3001/api/upload';

    try {
        const response = await fetch(uploadUrl, { method: 'POST', headers: headers, body: formData });
        if (!response.ok) throw new Error('File upload failed');
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error("Upload error, using placeholder:", error);
        return `https://picsum.photos/seed/${file.name}/300`;
    }
};

// --- Data Providers ---
export const fetchOrganizations = (): Promise<Organization[]> => !USE_MOCK ? client.get<Organization[]>('/organizations') : simulateFetch(_organizations);
export const fetchUsers = (): Promise<User[]> => !USE_MOCK ? client.get<User[]>('/users') : simulateFetch(_users);
export const fetchStations = (): Promise<Station[]> => !USE_MOCK ? client.get<Station[]>('/stations') : simulateFetch(_stations);
export const fetchFormDefinitions = (): Promise<FormDefinition[]> => !USE_MOCK ? client.get<FormDefinition[]>('/forms') : simulateFetch(_forms);
export const fetchSubmissions = (): Promise<ChecklistSubmission[]> => !USE_MOCK ? client.get<ChecklistSubmission[]>('/submissions') : simulateFetch(_submissions);
export const fetchIncidents = (): Promise<Incident[]> => !USE_MOCK ? client.get<Incident[]>('/incidents') : simulateFetch(_incidents);
export const fetchAudits = (): Promise<Audit[]> => !USE_MOCK ? client.get<Audit[]>('/audits') : simulateFetch(_audits);
export const fetchPermits = (): Promise<PermitToWork[]> => !USE_MOCK ? client.get<PermitToWork[]>('/permits') : simulateFetch(_permits);
export const fetchActivityLogs = (): Promise<ActivityLogEntry[]> => !USE_MOCK ? client.get<ActivityLogEntry[]>('/logs') : simulateFetch(_logs);
export const fetchContractors = (): Promise<Contractor[]> => !USE_MOCK ? client.get<Contractor[]>('/contractors') : simulateFetch(_contractors);
export const fetchVectors = (): Promise<Vector[]> => simulateFetch(_vectors);

// --- Write Operations ---
export const createStation = async (station: Partial<Station>): Promise<Station> => {
    if (!USE_MOCK) return client.post<Station>('/stations', station);
    const newStation = { ...station, id: `station-${Date.now()}` } as Station;
    _stations = [..._stations, newStation]; saveToStorage('STATIONS', _stations);
    return simulateFetch(newStation);
};
export const updateStation = async (station: Station): Promise<Station> => {
    if (!USE_MOCK) return client.put<Station>(`/stations/${station.id}`, station);
    _stations = _stations.map(s => s.id === station.id ? station : s); saveToStorage('STATIONS', _stations);
    return simulateFetch(station);
};
export const deleteStation = async (id: string): Promise<void> => {
    if (!USE_MOCK) return client.delete(`/stations/${id}`);
    _stations = _stations.filter(s => s.id !== id); saveToStorage('STATIONS', _stations);
    return simulateFetch(undefined);
};
export const updateUser = async (user: User): Promise<User> => {
    if (!USE_MOCK) return client.put<User>(`/users/${user.id}`, user);
    _users = _users.map(u => u.id === user.id ? user : u); saveToStorage('USERS', _users);
    return simulateFetch(user);
};
export const createUser = async (user: Partial<User>): Promise<User> => {
     if (!USE_MOCK) return client.post<User>('/users', user);
     const newUser = { ...user, id: `user-${Date.now()}` } as User;
     _users = [..._users, newUser]; saveToStorage('USERS', _users);
     return simulateFetch(newUser);
};
export const deleteUser = async (id: string): Promise<void> => {
    if (!USE_MOCK) return client.delete(`/users/${id}`);
    _users = _users.filter(u => u.id !== id); saveToStorage('USERS', _users);
    return simulateFetch(undefined);
};
export const updateOrganization = async (organization: Organization): Promise<Organization> => {
    if (!USE_MOCK) return client.put<Organization>(`/organizations/${organization.id}`, organization);
    _organizations = _organizations.map(o => o.id === organization.id ? organization : o); saveToStorage('ORGANIZATIONS', _organizations);
    return simulateFetch(organization);
};
export const createAudit = async (audit: Audit): Promise<Audit> => {
    if (!USE_MOCK) return client.post<Audit>('/audits', audit);
    _audits = [audit, ..._audits]; saveToStorage('AUDITS', _audits);
    return simulateFetch(audit);
};
export const updateAudit = async (audit: Audit): Promise<Audit> => {
    if (!USE_MOCK) return client.put<Audit>(`/audits/${audit.id}`, audit);
    _audits = _audits.map(a => a.id === audit.id ? audit : a); saveToStorage('AUDITS', _audits);
    return simulateFetch(audit);
};
export const deleteAudit = async (id: string): Promise<void> => {
    if (!USE_MOCK) return client.delete(`/audits/${id}`);
    _audits = _audits.filter(a => a.id !== id); saveToStorage('AUDITS', _audits);
    return simulateFetch(undefined);
};
export const createIncident = async (incident: Incident): Promise<Incident> => {
    if (!USE_MOCK) return client.post<Incident>('/incidents', incident);
    _incidents = [incident, ..._incidents]; saveToStorage('INCIDENTS', _incidents);
    return simulateFetch(incident);
};
export const updateIncident = async (incident: Incident): Promise<Incident> => {
    if (!USE_MOCK) return client.put<Incident>(`/incidents/${incident.id}`, incident);
    _incidents = _incidents.map(i => i.id === incident.id ? incident : i); saveToStorage('INCIDENTS', _incidents);
    return simulateFetch(incident);
};
export const createSubmission = async (submission: ChecklistSubmission): Promise<ChecklistSubmission> => {
    if (!USE_MOCK) return client.post<ChecklistSubmission>('/submissions', submission);
    _submissions = [submission, ..._submissions]; saveToStorage('SUBMISSIONS', _submissions);
    return simulateFetch(submission);
};
export const createPermit = async (permit: PermitToWork): Promise<PermitToWork> => {
    if (!USE_MOCK) return client.post<PermitToWork>('/permits', permit);
    _permits = [permit, ..._permits]; saveToStorage('PERMITS', _permits);
    return simulateFetch(permit);
};
export const updatePermit = async (permit: PermitToWork): Promise<PermitToWork> => {
    if (!USE_MOCK) return client.put<PermitToWork>(`/permits/${permit.id}`, permit);
    _permits = _permits.map(p => p.id === permit.id ? permit : p); saveToStorage('PERMITS', _permits);
    return simulateFetch(permit);
};
export const createLog = async (log: ActivityLogEntry): Promise<ActivityLogEntry> => {
    if (!USE_MOCK) return client.post<ActivityLogEntry>('/logs', log);
    _logs = [log, ..._logs]; saveToStorage('LOGS', _logs);
    return simulateFetch(log);
};
export const createForm = async (form: Partial<FormDefinition>): Promise<FormDefinition> => {
    if (!USE_MOCK) return client.post<FormDefinition>('/forms', form);
    const newForm = { ...form, id: form.id || `form-${Date.now()}` } as FormDefinition;
    _forms = [..._forms, newForm]; saveToStorage('FORMS', _forms);
    return simulateFetch(newForm);
};
export const updateForm = async (form: FormDefinition): Promise<FormDefinition> => {
     if (!USE_MOCK) return client.put<FormDefinition>(`/forms/${form.id}`, form);
    _forms = _forms.map(f => f.id === form.id ? form : f); saveToStorage('FORMS', _forms);
    return simulateFetch(form);
};
export const deleteForm = async (id: string): Promise<void> => {
    if (!USE_MOCK) return client.delete(`/forms/${id}`);
    _forms = _forms.filter(f => f.id !== id); saveToStorage('FORMS', _forms);
    return simulateFetch(undefined);
};
export const updateVectors = async (vectors: Vector[]): Promise<Vector[]> => {
    _vectors = vectors; saveToStorage('VECTORS', _vectors);
    return simulateFetch(vectors);
}