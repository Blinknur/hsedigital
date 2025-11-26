import { logger } from '../utils/logger.js';

export const REGIONS = {
  US_EAST: {
    id: 'us-east-1',
    name: 'US East (Virginia)',
    primary: true,
    database: {
      primary: process.env.DATABASE_URL_US_EAST_PRIMARY,
      replica: process.env.DATABASE_URL_US_EAST_REPLICA,
    },
    redis: {
      nodes: process.env.REDIS_CLUSTER_US_EAST?.split(',') || [],
      sentinels: process.env.REDIS_SENTINELS_US_EAST?.split(',').map(s => {
        const [host, port] = s.split(':');
        return { host, port: parseInt(port) };
      }) || [],
    },
    cdn: {
      endpoint: process.env.CDN_ENDPOINT_US_EAST,
      originDomain: process.env.CDN_ORIGIN_US_EAST,
    },
    loadBalancer: process.env.LB_ENDPOINT_US_EAST,
    priority: 1,
  },
  EU_WEST: {
    id: 'eu-west-1',
    name: 'EU West (Ireland)',
    primary: false,
    database: {
      primary: process.env.DATABASE_URL_EU_WEST_PRIMARY,
      replica: process.env.DATABASE_URL_EU_WEST_REPLICA,
    },
    redis: {
      nodes: process.env.REDIS_CLUSTER_EU_WEST?.split(',') || [],
      sentinels: process.env.REDIS_SENTINELS_EU_WEST?.split(',').map(s => {
        const [host, port] = s.split(':');
        return { host, port: parseInt(port) };
      }) || [],
    },
    cdn: {
      endpoint: process.env.CDN_ENDPOINT_EU_WEST,
      originDomain: process.env.CDN_ORIGIN_EU_WEST,
    },
    loadBalancer: process.env.LB_ENDPOINT_EU_WEST,
    priority: 2,
  },
  AP_SOUTHEAST: {
    id: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    primary: false,
    database: {
      primary: process.env.DATABASE_URL_AP_SOUTHEAST_PRIMARY,
      replica: process.env.DATABASE_URL_AP_SOUTHEAST_REPLICA,
    },
    redis: {
      nodes: process.env.REDIS_CLUSTER_AP_SOUTHEAST?.split(',') || [],
      sentinels: process.env.REDIS_SENTINELS_AP_SOUTHEAST?.split(',').map(s => {
        const [host, port] = s.split(':');
        return { host, port: parseInt(port) };
      }) || [],
    },
    cdn: {
      endpoint: process.env.CDN_ENDPOINT_AP_SOUTHEAST,
      originDomain: process.env.CDN_ORIGIN_AP_SOUTHEAST,
    },
    loadBalancer: process.env.LB_ENDPOINT_AP_SOUTHEAST,
    priority: 3,
  },
};

export const GEO_ROUTING_RULES = {
  NA: 'US_EAST',
  SA: 'US_EAST',
  EU: 'EU_WEST',
  AF: 'EU_WEST',
  AS: 'AP_SOUTHEAST',
  OC: 'AP_SOUTHEAST',
};

export const TENANT_REGION_OVERRIDES = new Map();

export function getCurrentRegion() {
  const regionId = process.env.DEPLOYMENT_REGION || 'US_EAST';
  return REGIONS[regionId];
}

export function getRegionById(regionId) {
  return REGIONS[regionId];
}

export function getRegionForTenant(tenantId, tenantRegionPreference = null) {
  if (TENANT_REGION_OVERRIDES.has(tenantId)) {
    return REGIONS[TENANT_REGION_OVERRIDES.get(tenantId)];
  }
  
  if (tenantRegionPreference && REGIONS[tenantRegionPreference]) {
    return REGIONS[tenantRegionPreference];
  }
  
  return getCurrentRegion();
}

export function getRegionByGeoLocation(geoCode) {
  const regionKey = GEO_ROUTING_RULES[geoCode] || 'US_EAST';
  return REGIONS[regionKey];
}

export function getAllRegions() {
  return Object.values(REGIONS);
}

export function getPrimaryRegion() {
  return Object.values(REGIONS).find(r => r.primary) || REGIONS.US_EAST;
}

export function getFailoverRegions(currentRegionId) {
  return Object.values(REGIONS)
    .filter(r => r.id !== currentRegionId)
    .sort((a, b) => a.priority - b.priority);
}

export async function setTenantRegionPreference(tenantId, regionKey) {
  if (!REGIONS[regionKey]) {
    throw new Error(`Invalid region: ${regionKey}`);
  }
  
  TENANT_REGION_OVERRIDES.set(tenantId, regionKey);
  logger.info({ tenantId, region: regionKey }, 'Tenant region preference updated');
}

export function loadTenantRegionMappings(mappings) {
  Object.entries(mappings).forEach(([tenantId, regionKey]) => {
    if (REGIONS[regionKey]) {
      TENANT_REGION_OVERRIDES.set(tenantId, regionKey);
    }
  });
  logger.info({ count: TENANT_REGION_OVERRIDES.size }, 'Loaded tenant region mappings');
}

export const CDN_CONFIG = {
  enabled: process.env.CDN_ENABLED === 'true',
  provider: process.env.CDN_PROVIDER || 'cloudflare',
  purgeOnDeploy: process.env.CDN_PURGE_ON_DEPLOY === 'true',
  staticAssetPaths: ['/assets', '/uploads', '/images', '/fonts'],
  cacheTTL: {
    static: 31536000,
    dynamic: 3600,
    api: 0,
  },
  gzipEnabled: true,
  brotliEnabled: true,
};

export const FAILOVER_CONFIG = {
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
  maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || '3'),
  autoFailoverEnabled: process.env.AUTO_FAILOVER_ENABLED === 'true',
  manualFailoverRequired: process.env.MANUAL_FAILOVER_REQUIRED === 'true',
  failbackEnabled: process.env.FAILBACK_ENABLED === 'true',
  failbackDelay: parseInt(process.env.FAILBACK_DELAY || '300000'),
};

logger.info({
  currentRegion: getCurrentRegion().name,
  totalRegions: Object.keys(REGIONS).length,
  cdnEnabled: CDN_CONFIG.enabled,
  autoFailover: FAILOVER_CONFIG.autoFailoverEnabled,
}, 'Multi-region configuration initialized');
