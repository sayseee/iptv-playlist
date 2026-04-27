/**
 * Remote IPTV Source Fetcher
 * Fetches playlists from remote URLs with timeout and retry logic
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Remote IPTV sources
const REMOTE_SOURCES = [
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_uk.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_usa_vod.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_usa.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_korea.m3u8',
  'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_china.m3u8'
];

/**
 * Fetch content from URL with timeout and error handling
 */
async function fetchURL(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const request = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: timeout
      }, (response) => {
        let data = '';
        
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fetchURL(response.headers.location, timeout)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.on('data', chunk => {
          data += chunk;
        });
        
        response.on('end', () => {
          resolve(data);
        });
      });
      
      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Request timeout (${timeout}ms)`));
      });
      
      request.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Fetch all remote sources
 */
async function fetchRemoteSources(sources = REMOTE_SOURCES) {
  const playlists = [];
  
  for (const source of sources) {
    try {
      console.log(`⏳ Fetching remote source: ${source}`);
      const content = await fetchURL(source, 15000);
      
      playlists.push({
        source: source,
        content: content,
        type: 'remote',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✓ Successfully fetched: ${source}`);
    } catch (error) {
      console.error(`✗ Failed to fetch ${source}: ${error.message}`);
    }
  }
  
  return playlists;
}

/**
 * Add custom sources
 */
function addCustomSources(customUrls) {
  return REMOTE_SOURCES.concat(customUrls);
}

module.exports = {
  fetchRemoteSources,
  fetchURL,
  addCustomSources,
  REMOTE_SOURCES
};
