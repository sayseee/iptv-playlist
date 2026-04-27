/**
 * Stream Health Checker (Advanced)
 * Geo-aware, latency-aware, stability-aware IPTV stream validator
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Make HTTP/HTTPS request
 */
function makeRequest(url, method = 'HEAD', timeout = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(url, {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      timeout
    }, (res) => {
      resolve(res);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    req.on('error', (err) => reject(err));

    req.end();
  });
}

/**
 * Detect geo-blocking
 */
function isGeoBlocked(response, error, body = '') {
  // HTTP status level
  if (response && [403, 451].includes(response.statusCode)) {
    return true;
  }

  // Response body level
  const text = (body || '').toLowerCase();

  if (
    text.includes('not available in your region') ||
    text.includes('geo-restricted') ||
    text.includes('geo blocked') ||
    text.includes('access denied') ||
    text.includes('forbidden') ||
    text.includes('country not allowed')
  ) {
    return true;
  }

  // Error level
  if (error && error.message) {
    const msg = error.message.toLowerCase();

    if (
      msg.includes('403') ||
      msg.includes('forbidden') ||
      msg.includes('denied') ||
      msg.includes('blocked')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if URL looks like a real stream
 */
function isLikelyStream(url) {
  const u = url.toLowerCase();
  return (
    u.includes('.m3u8') ||
    u.includes('.ts') ||
    u.includes('live') ||
    u.includes('stream')
  );
}

/**
 * Test a single stream
 */
async function checkStreamHealth(url, timeout = 5000) {
  const startTime = Date.now();

  try {
    // STEP 1: HEAD request (fast)
    let response = await makeRequest(url, 'HEAD', timeout);
    let latency = Date.now() - startTime;

    let geoBlocked = isGeoBlocked(response, null);

    // STEP 2: If response looks OK, verify with GET
    if (response.statusCode >= 200 && response.statusCode < 400) {
      try {
        const getRes = await makeRequest(url, 'GET', timeout);

        geoBlocked = isGeoBlocked(getRes, null) || geoBlocked;

      } catch (err) {
        geoBlocked = isGeoBlocked(null, err);
      }
    }

    const alive =
      response.statusCode >= 200 &&
      response.statusCode < 400 &&
      !geoBlocked;

    return {
      url,
      alive,
      status: response.statusCode,
      latency,
      geoBlocked,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      url,
      alive: false,
      status: error.code || 'error',
      latency: Date.now() - startTime,
      geoBlocked: isGeoBlocked(null, error),
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Retry wrapper for unstable streams
 */
async function testWithRetry(url, retries = 2, timeout = 5000) {
  let lastResult = null;

  for (let i = 0; i <= retries; i++) {
    const result = await checkStreamHealth(url, timeout);
    lastResult = result;

    if (result.alive) return result;
  }

  return lastResult;
}

/**
 * Batch health checker
 */
async function checkStreamsHealth(streams, batchSize = 5, timeout = 5000) {
  const results = [];
  const total = streams.length;

  // Pre-filter (performance boost)
  const filteredStreams = streams.filter(s => {
    const url = s.url.toLowerCase();

    return (
      isLikelyStream(url) &&
      !url.includes('drm') &&
      !url.includes('token') &&
      !url.includes('expired')
    );
  });

  console.log(`Filtered ${streams.length - filteredStreams.length} invalid streams`);

  for (let i = 0; i < filteredStreams.length; i += batchSize) {
    const batch = filteredStreams.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(stream => testWithRetry(stream.url, 1, timeout))
    );

    results.push(...batchResults);

    const processed = Math.min(i + batchSize, filteredStreams.length);
    console.log(`Health check progress: ${processed}/${filteredStreams.length}`);
  }

  return results;
}

/**
 * Score stream quality
 */
function scoreStream(healthData) {
  let score = 0;

  if (healthData.alive && !healthData.geoBlocked) {
    score += 100;

    if (healthData.latency < 1000) score += 20;
    else if (healthData.latency < 2000) score += 10;
    else if (healthData.latency < 5000) score += 5;

  } else {
    score -= 100; // Hard penalty
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
        geoBlocked: true,
        status: 'unknown'
      };

      return {
        ...stream,
        ...health,
        score: scoreStream(health)
      };
    })
    .filter(s => !s.geoBlocked) // 🔥 remove geo-blocked streams
    .sort((a, b) => {
      if (a.alive !== b.alive) return b.alive ? 1 : -1;
      return b.score - a.score;
    });
}

module.exports = {
  checkStreamHealth,
  checkStreamsHealth,
  scoreStream,
  rankStreams
};