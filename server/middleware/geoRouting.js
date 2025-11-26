import { logger } from '../utils/logger.js';
import { getRegionByGeoLocation, getRegionForTenant, getCurrentRegion } from '../config/multiRegion.js';

const GEO_HEADER_PRIORITY = [
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-vercel-ip-country',
  'x-country-code',
  'x-geo-country',
];

const CONTINENT_MAP = {
  US: 'NA', CA: 'NA', MX: 'NA',
  BR: 'SA', AR: 'SA', CL: 'SA', CO: 'SA', PE: 'SA', VE: 'SA',
  GB: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', NL: 'EU', SE: 'EU', NO: 'EU', PL: 'EU', IE: 'EU',
  CN: 'AS', JP: 'AS', IN: 'AS', KR: 'AS', SG: 'AS', TH: 'AS', VN: 'AS', MY: 'AS', ID: 'AS', PH: 'AS',
  AU: 'OC', NZ: 'OC',
  ZA: 'AF', EG: 'AF', NG: 'AF', KE: 'AF',
};

function getCountryFromHeaders(req) {
  for (const header of GEO_HEADER_PRIORITY) {
    const value = req.headers[header];
    if (value && value.length === 2) {
      return value.toUpperCase();
    }
  }
  return null;
}

function getContinentFromCountry(countryCode) {
  return CONTINENT_MAP[countryCode] || 'NA';
}

function parseCloudflareLocation(req) {
  const cfIpCountry = req.headers['cf-ipcountry'];
  const cfRegion = req.headers['cf-region'];
  const cfCity = req.headers['cf-ipcity'];
  const cfLatitude = req.headers['cf-latitude'];
  const cfLongitude = req.headers['cf-longitude'];

  if (cfIpCountry) {
    return {
      country: cfIpCountry,
      continent: getContinentFromCountry(cfIpCountry),
      region: cfRegion,
      city: cfCity,
      latitude: cfLatitude ? parseFloat(cfLatitude) : null,
      longitude: cfLongitude ? parseFloat(cfLongitude) : null,
      provider: 'cloudflare',
    };
  }
  return null;
}

function parseAWSLocation(req) {
  const country = req.headers['cloudfront-viewer-country'];
  const city = req.headers['cloudfront-viewer-city'];
  const latitude = req.headers['cloudfront-viewer-latitude'];
  const longitude = req.headers['cloudfront-viewer-longitude'];

  if (country) {
    return {
      country,
      continent: getContinentFromCountry(country),
      city,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      provider: 'aws',
    };
  }
  return null;
}

function parseVercelLocation(req) {
  const country = req.headers['x-vercel-ip-country'];
  const city = req.headers['x-vercel-ip-city'];
  const region = req.headers['x-vercel-ip-country-region'];
  const latitude = req.headers['x-vercel-ip-latitude'];
  const longitude = req.headers['x-vercel-ip-longitude'];

  if (country) {
    return {
      country,
      continent: getContinentFromCountry(country),
      region,
      city,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      provider: 'vercel',
    };
  }
  return null;
}

export function geoLocationMiddleware(req, res, next) {
  let geoData = parseCloudflareLocation(req) ||
                parseAWSLocation(req) ||
                parseVercelLocation(req);

  if (!geoData) {
    const country = getCountryFromHeaders(req);
    if (country) {
      geoData = {
        country,
        continent: getContinentFromCountry(country),
        provider: 'generic',
      };
    } else {
      geoData = {
        country: 'US',
        continent: 'NA',
        provider: 'default',
      };
    }
  }

  req.geoLocation = geoData;
  
  logger.debug({
    ip: req.ip,
    country: geoData.country,
    continent: geoData.continent,
    provider: geoData.provider,
  }, 'Geo-location detected');

  next();
}

export function tenantRegionRouting(req, res, next) {
  let targetRegion;

  if (req.tenantId) {
    const tenant = req.tenant;
    const tenantRegionPreference = tenant?.regionPreference || null;
    targetRegion = getRegionForTenant(req.tenantId, tenantRegionPreference);
  } else if (req.geoLocation) {
    targetRegion = getRegionByGeoLocation(req.geoLocation.continent);
  } else {
    targetRegion = getCurrentRegion();
  }

  req.targetRegion = targetRegion;
  req.headers['x-target-region'] = targetRegion.id;

  logger.debug({
    tenantId: req.tenantId,
    geoContinent: req.geoLocation?.continent,
    targetRegion: targetRegion.name,
  }, 'Region routing determined');

  next();
}

export function regionProxyMiddleware(req, res, next) {
  const currentRegion = getCurrentRegion();
  const targetRegion = req.targetRegion;

  if (!targetRegion || targetRegion.id === currentRegion.id) {
    return next();
  }

  if (process.env.ENABLE_CROSS_REGION_PROXY !== 'true') {
    logger.debug('Cross-region proxy disabled, serving from current region');
    return next();
  }

  const shouldProxy = req.method === 'GET' || req.method === 'HEAD';
  
  if (!shouldProxy) {
    logger.debug('Non-GET request, serving from current region');
    return next();
  }

  logger.info({
    from: currentRegion.name,
    to: targetRegion.name,
    path: req.path,
  }, 'Cross-region proxy request');

  const targetUrl = `${targetRegion.loadBalancer}${req.originalUrl}`;
  
  res.setHeader('X-Served-By-Region', currentRegion.id);
  res.setHeader('X-Proxied-To-Region', targetRegion.id);
  res.setHeader('X-Geo-Routing', 'true');

  return res.redirect(307, targetUrl);
}

export function cdnHeadersMiddleware(req, res, next) {
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp|avif)$/i.test(req.path);
  const isUpload = req.path.startsWith('/uploads');
  
  if (isStaticAsset || isUpload) {
    const currentRegion = getCurrentRegion();
    
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Region', currentRegion.id);
    res.setHeader('X-CDN-Cache', 'HIT');
    res.setHeader('Vary', 'Accept-Encoding');
    
    if (process.env.CDN_ENABLED === 'true') {
      res.setHeader('X-CDN-Provider', process.env.CDN_PROVIDER || 'cloudflare');
    }
  }
  
  next();
}

export function geoRoutingHeaders(req, res, next) {
  const currentRegion = getCurrentRegion();
  
  res.setHeader('X-Region', currentRegion.id);
  res.setHeader('X-Region-Name', currentRegion.name);
  
  if (req.geoLocation) {
    res.setHeader('X-Client-Country', req.geoLocation.country);
    res.setHeader('X-Client-Continent', req.geoLocation.continent);
  }
  
  if (req.targetRegion && req.targetRegion.id !== currentRegion.id) {
    res.setHeader('X-Optimal-Region', req.targetRegion.id);
  }
  
  next();
}
