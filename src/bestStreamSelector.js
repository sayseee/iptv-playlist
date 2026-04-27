/**
 * Best Stream Selector
 * Selects the best stream for each channel using multiple criteria
 */

const { rankStreams } = require('./healthChecker');

/**
 * Calculate source priority
 * Official sources get higher priority
 */
function getSourcePriority(source) {
  const sourceMap = {
    'iptv-org.github.io': 100,
    'github.com/Free-TV': 90,
    'official': 85,
    'primary': 80
  };
  
  for (const [key, priority] of Object.entries(sourceMap)) {
    if (source.toLowerCase().includes(key)) {
      return priority;
    }
  }
  
  return 50; // Default priority for unknown sources
}

/**
 * Score a stream candidate
 */
function scoreStreamCandidate(stream, healthData = null) {
  let score = 0;
  
  // Health score (if available)
  if (healthData) {
    if (healthData.alive) {
      score += 50;
      // Bonus for low latency
      if (healthData.latency < 1000) score += 30;
      else if (healthData.latency < 2000) score += 15;
    }
  } else {
    score += 30; // Neutral score if no health data
  }
  
  // Source priority
  const sourcePriority = getSourcePriority(stream.source || '');
  score += (sourcePriority / 100) * 20;
  
  return score;
}

/**
 * Select best stream from alternatives
 */
function selectBestStream(channelGroup, healthDataMap = {}) {
  if (!channelGroup.streams || channelGroup.streams.length === 0) {
    return null;
  }
  
  // Filter out geo-blocked streams
  const nonBlockedStreams = channelGroup.streams.filter(stream => {
    const health = healthDataMap[stream.url];
    return !health || !health.geoBlocked;
  });
  
  if (nonBlockedStreams.length === 0) {
    // All streams are geo-blocked, return null
    return null;
  }
  
  // Score each non-blocked stream
  const scoredStreams = nonBlockedStreams.map(stream => ({
    ...stream,
    health: healthDataMap[stream.url],
    score: scoreStreamCandidate(stream, healthDataMap[stream.url])
  }));
  
  // Sort by score (descending)
  scoredStreams.sort((a, b) => b.score - a.score);
  
  // Return the best stream
  return {
    channel: channelGroup.name,
    normalized_name: channelGroup.normalized_name,
    best_stream: scoredStreams[0],
    alternatives: scoredStreams.slice(1),
    total_alternatives: scoredStreams.length,
    group: channelGroup.group
  };
}

/**
 * Select best streams for all channels
 */
function selectBestStreamsForAll(channelGroups, healthDataArray = []) {
  // Create health data map for quick lookup
  const healthDataMap = {};
  healthDataArray.forEach(health => {
    healthDataMap[health.url] = health;
  });
  
  return channelGroups.map(group => selectBestStream(group, healthDataMap));
}

/**
 * Build final playlist with best streams
 */
function buildFinalPlaylist(selectedStreams) {
  const playlist = [];
  
  selectedStreams.forEach(item => {
    if (item && item.best_stream) {
      playlist.push({
        title: item.channel,
        url: item.best_stream.url,
        tvgId: item.best_stream.tvgId || '',
        tvgName: item.best_stream.title,
        tvgLogo: item.best_stream.tvgLogo || '',
        group: item.group || 'Uncategorized',
        source: item.best_stream.source || 'unknown',
        health: {
          alive: item.best_stream.health ? item.best_stream.health.alive : null,
          latency: item.best_stream.health ? item.best_stream.health.latency : null
        },
        score: item.best_stream.score
      });
    }
  });
  
  return playlist;
}

module.exports = {
  selectBestStream,
  selectBestStreamsForAll,
  buildFinalPlaylist,
  scoreStreamCandidate,
  getSourcePriority
};
