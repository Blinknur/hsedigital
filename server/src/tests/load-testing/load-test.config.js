export const LOAD_TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  
  scenarios: {
    smoke: {
      duration: 30,
      connections: 10,
      pipelining: 1,
      requests: 100
    },
    light: {
      duration: 60,
      connections: 50,
      pipelining: 1,
      requests: 1000
    },
    moderate: {
      duration: 120,
      connections: 100,
      pipelining: 5,
      requests: 10000
    },
    stress: {
      duration: 300,
      connections: 500,
      pipelining: 10,
      requests: 50000
    },
    spike: {
      duration: 60,
      connections: 1000,
      pipelining: 10,
      requests: 100000
    }
  },

  endpoints: {
    health: {
      path: '/api/health',
      method: 'GET',
      requiresAuth: false
    },
    stations: {
      path: '/api/stations',
      method: 'GET',
      requiresAuth: true
    },
    audits: {
      path: '/api/audits',
      method: 'GET',
      requiresAuth: true
    },
    incidents: {
      path: '/api/incidents',
      method: 'GET',
      requiresAuth: true
    },
    contractors: {
      path: '/api/contractors',
      method: 'GET',
      requiresAuth: true
    },
    createStation: {
      path: '/api/stations',
      method: 'POST',
      requiresAuth: true,
      body: {
        name: 'Load Test Station',
        brand: 'Shell',
        region: 'North',
        address: '123 Test St',
        location: { lat: 51.5074, lng: -0.1278 },
        riskCategory: 'Low',
        auditFrequency: 'Annually'
      }
    },
    createAudit: {
      path: '/api/audits',
      method: 'POST',
      requiresAuth: true
    },
    createIncident: {
      path: '/api/incidents',
      method: 'POST',
      requiresAuth: true
    }
  },

  tenants: {
    concurrent: parseInt(process.env.CONCURRENT_TENANTS) || 10,
    dataVolumes: {
      small: { stations: 10, audits: 50, incidents: 20, users: 5 },
      medium: { stations: 100, audits: 500, incidents: 200, users: 50 },
      large: { stations: 1000, audits: 5000, incidents: 2000, users: 500 }
    }
  },

  thresholds: {
    p50: 200,
    p95: 500,
    p99: 1000,
    maxErrorRate: 0.05,
    minThroughput: 100
  },

  monitoring: {
    sampleInterval: 1000,
    collectMetrics: true,
    trackResources: true
  }
};
