/**
 * Geo-Location and Region Detection
 * Detects user region, geo-blocked markers, and finds working streams by region
 */

const https = require('https');

/**
 * Detect geo-blocked marker in channel title
 * e.g., "[Geo-blocked]", "(Geo-blocked)", "[Blocked]"
 */
function detectGeoBlockedMarker(title) {
  const geoMarkers = [
    /\[geo-blocked\]/i,
    /\(geo-blocked\)/i,
    /\[blocked\]/i,
    /\(blocked\)/i,
    /\[unavailable\]/i,
    /\(unavailable\)/i,
    /geo-locked/i,
    /region-locked/i,
    /not available/i
  ];
  
  return geoMarkers.some(marker => marker.test(title));
}

/**
 * Extract region from title
 * e.g., "[US Only]", "(UK)", "[Germany]"
 */
function extractRegionRestriction(title) {
  const regionPatterns = [
    /\[(us|uk|ca|au|de|fr|es|it|nl|be|se|no|ch|at|cz|pl|ru|cn|jp|kr|in|br|mx|za)\s?only\]/i,
    /\((us|uk|ca|au|de|fr|es|it|nl|be|se|no|ch|at|cz|pl|ru|cn|jp|kr|in|br|mx|za)\)/i,
    /(us|uk|canada|australia|germany|france|spain|korea|china|japan|india|brazil)\s?only/i
  ];
  
  for (const pattern of regionPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].toUpperCase().substring(0, 2);
    }
  }
  
  return null;
}

/**
 * Get user's region from IP address
 * Uses ip-api.com for geolocation
 */
async function getUserRegion() {
  return new Promise((resolve) => {
    try {
      const request = https.get('https://ipapi.co/json/', {
        headers: { 'User-Agent': 'IPTV-Aggregator/1.0' },
        timeout: 5000
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const geo = JSON.parse(data);
            resolve({
              country_code: geo.country_code || 'US',
              country_name: geo.country_name || 'United States',
              region: geo.region || '',
              city: geo.city || '',
              latitude: geo.latitude,
              longitude: geo.longitude
            });
          } catch {
            resolve({ country_code: 'US', country_name: 'United States (default)' });
          }
        });
      });
      
      request.on('error', () => {
        resolve({ country_code: 'US', country_name: 'United States (default)' });
      });
      
      request.on('timeout', () => {
        request.destroy();
        resolve({ country_code: 'US', country_name: 'United States (default)' });
      });
    } catch {
      resolve({ country_code: 'US', country_name: 'United States (default)' });
    }
  });
}

/**
 * Check if a stream is accessible in a specific region
 * Tests stream headers with User-Agent that might affect geo-blocking
 */
async function testStreamForRegion(url, region, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : require('http');
      
      const request = client.request(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Region/${region}`,
          'Accept-Language': `en-${region};q=0.9,en;q=0.8`
        },
        timeout: timeout
      }, (response) => {
        const statusCode = response.statusCode;
        
        // Determine if accessible
        const isAccessible = statusCode >= 200 && statusCode < 400;
        const isGeoBlocked = statusCode === 403 || statusCode === 451;
        
        request.destroy();
        resolve({
          url: url,
          region: region,
          accessible: isAccessible,
          statusCode: statusCode,
          geoBlocked: isGeoBlocked,
          latency: Date.now() - startTime
        });
      });
      
      const startTime = Date.now();
      
      request.on('error', (error) => {
        resolve({
          url: url,
          region: region,
          accessible: false,
          statusCode: 'error',
          error: error.message,
          geoBlocked: false,
          latency: Date.now() - startTime
        });
      });
      
      request.on('timeout', () => {
        request.destroy();
        resolve({
          url: url,
          region: region,
          accessible: false,
          statusCode: 'timeout',
          geoBlocked: false,
          latency: timeout
        });
      });
      
      request.end();
    } catch (error) {
      resolve({
        url: url,
        region: region,
        accessible: false,
        statusCode: 'error',
        error: error.message,
        geoBlocked: false,
        latency: 0
      });
    }
  });
}

/**
 * Test multiple streams for a specific region
 */
async function testStreamsForRegion(streams, region, batchSize = 5, timeout = 5000) {
  const results = [];
  
  for (let i = 0; i < streams.length; i += batchSize) {
    const batch = streams.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(stream => testStreamForRegion(stream.url, region, timeout))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Score stream accessibility for a region
 */
function scoreStreamForRegion(stream, regionTestResult) {
  let score = 0;
  
  if (regionTestResult.accessible) {
    score += 100; // Base score for accessible
    
    // Bonus for low latency
    if (regionTestResult.latency < 1000) score += 20;
    else if (regionTestResult.latency < 2000) score += 10;
  }
  
  return score;
}

/**
 * Clean geo-blocked markers from title for display
 */
function cleanGeoBlockedTitle(title) {
  return title
    .replace(/\s*\[geo-blocked\]\s*/i, '')
    .replace(/\s*\(geo-blocked\)\s*/i, '')
    .replace(/\s*\[blocked\]\s*/i, '')
    .replace(/\s*\(blocked\)\s*/i, '')
    .replace(/\s*\[unavailable\]\s*/i, '')
    .replace(/\s*\(unavailable\)\s*/i, '')
    .trim();
}

module.exports = {
  detectGeoBlockedMarker,
  extractRegionRestriction,
  getUserRegion,
  testStreamForRegion,
  testStreamsForRegion,
  scoreStreamForRegion,
  cleanGeoBlockedTitle
};
