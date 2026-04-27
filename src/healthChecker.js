/**
 * Stream Health Checker
 * Tests stream URLs for availability and measures latency
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Detect if a stream is geo-blocked
 * Common geo-block indicators:
 * - HTTP 403 Forbidden
 * - HTTP 451 Unavailable For Legal Reasons
 * - Specific error messages about geographic restrictions
 */
function isGeoBlocked(response, error) {
  if (response && response.statusCode) {
    // Common geo-block status codes
    if (response.statusCode === 403 || response.statusCode === 451) {
      return true;
    }
  }
  
  if (error && error.message) {
    const msg = error.message.toLowerCase();
    if (msg.includes('403') || msg.includes('geo') || msg.includes('block') || msg.includes('restricted')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a stream URL is accessible
 */
async function checkStreamHealth(url, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let isResolved = false;
    
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const request = client.request(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: timeout
      }, (response) => {
        if (!isResolved) {
          isResolved = true;
          const latency = Date.now() - startTime;
          const isAlive = response.statusCode >= 200 && response.statusCode < 400;
          const geoBlocked = isGeoBlocked(response, null);
          
          resolve({
            url: url,
            alive: isAlive,
            status: response.statusCode,
            latency: latency,
            geoBlocked: geoBlocked,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      request.on('timeout', () => {
        if (!isResolved) {
          isResolved = true;
          request.destroy();
          resolve({
            url: url,
            alive: false,
            status: 'timeout',
            latency: timeout,
            geoBlocked: false,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      request.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          const latency = Date.now() - startTime;
          const geoBlocked = isGeoBlocked(null, error);
          resolve({
            url: url,
            alive: false,
            status: error.code || 'error',
            latency: latency,
            geoBlocked: geoBlocked,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      request.end();
    } catch (error) {
      if (!isResolved) {
        isResolved = true;
        const latency = Date.now() - startTime;
        const geoBlocked = isGeoBlocked(null, error);
        resolve({
          url: url,
          alive: false,
          status: 'error',
          latency: latency,
          geoBlocked: geoBlocked,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

/**
 * Check multiple streams with batching
 */
async function checkStreamsHealth(streams, batchSize = 5, timeout = 5000) {
  const results = [];
  const total = streams.length;
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < streams.length; i += batchSize) {
    const batch = streams.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(stream => checkStreamHealth(stream.url, timeout))
    );
    results.push(...batchResults);
    
    // Show progress
    const processed = Math.min(i + batchSize, total);
    console.log(`Health check progress: ${processed}/${total} streams`);
  }
  
  return results;
}

/**
 * Score stream based on health metrics
 */
function scoreStream(healthData) {
  let score = 0;
  
  if (healthData.alive) {
    score += 100; // Base score for alive stream
    
    // Latency scoring (lower is better)
    // 0-1000ms = 20 points, 1000-2000ms = 10 points, etc.
    if (healthData.latency < 1000) {
      score += 20;
    } else if (healthData.latency < 2000) {
      score += 10;
    } else if (healthData.latency < 5000) {
      score += 5;
    }
  }
  
  return score;
}

/**
 * Rank streams for a channel
 */
function rankStreams(streams, healthData) {
  return streams
    .map(stream => {
      const health = healthData.find(h => h.url === stream.url) || {
        alive: false,
        latency: 10000,
        status: 'unknown'
      };
      
      return {
        ...stream,
        ...health,
        score: scoreStream(health)
      };
    })
    .sort((a, b) => {
      // Prefer alive streams
      if (a.alive !== b.alive) {
        return b.alive ? 1 : -1;
      }
      // Then sort by score (higher is better)
      return b.score - a.score;
    });
}

module.exports = {
  checkStreamHealth,
  checkStreamsHealth,
  scoreStream,
  rankStreams
};
