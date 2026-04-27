/**
 * Best Stream Selector (FIXED STABLE VERSION)
 */

function getSourcePriority(source = '') {
  const map = {
    'iptv-org.github.io': 100,
    'github.com/Free-TV': 90,
    'official': 85,
    'primary': 80
  };

  for (const key in map) {
    if (source.toLowerCase().includes(key)) {
      return map[key];
    }
  }

  return 50;
}

function scoreStream(stream, health) {
  let score = 40; // 🔥 base score (IMPORTANT FIX)

  // Health boost (optional only)
  if (health?.alive) {
    score += 40;

    if (health.latency < 1000) score += 25;
    else if (health.latency < 2000) score += 15;
  }

  // Penalize geo-blocked
  if (health?.geoBlocked) {
    score -= 100;
  }

  // Source priority
  score += (getSourcePriority(stream.source) / 100) * 20;

  return score;
}

/**
 * Select best stream safely (NO NULL COLLAPSE EVER)
 */
function selectBestStream(group, healthMap = {}) {
  if (!group || !group.streams || group.streams.length === 0) {
    return {
      channel: group?.name || 'Unknown',
      normalized_name: group?.normalized_name || '',
      best_stream: null,
      alternatives: [],
      total_alternatives: 0,
      group: group?.group || 'Uncategorized'
    };
  }

  let streams = group.streams;

  // optional filtering only if health exists
  if (Object.keys(healthMap).length > 0) {
    streams = streams.filter(s => {
      const h = healthMap[s.url];
      return !h?.geoBlocked;
    });
  }

  // 🔥 CRITICAL FALLBACK (prevents empty collapse)
  if (!streams.length) {
    streams = group.streams;
  }

  const scored = streams.map(s => ({
    ...s,
    health: healthMap[s.url],
    score: scoreStream(s, healthMap[s.url])
  }));

  // 🔥 HARD GUARANTEE: NEVER EMPTY
  if (!scored.length) {
    return {
      channel: group.name,
      normalized_name: group.normalized_name,
      best_stream: group.streams[0], // fallback raw stream
      alternatives: [],
      total_alternatives: 1,
      group: group.group
    };
  }

  scored.sort((a, b) => b.score - a.score);

  return {
    channel: group.name,
    normalized_name: group.normalized_name,
    best_stream: scored[0],
    alternatives: scored.slice(1),
    total_alternatives: scored.length,
    group: group.group
  };
}

/**
 * Select all streams (SAFE MODE ALWAYS)
 */
function selectBestStreamsForAll(groups, healthArray = []) {
  const map = {};

  healthArray.forEach(h => {
    map[h.url] = h;
  });

  return groups.map(g => selectBestStream(g, map));
}

/**
 * Build final playlist (SAFE GUARANTEE)
 */
function buildFinalPlaylist(selected) {
  const playlist = [];

  selected.forEach(item => {
    if (!item) return;

    // 🔥 EVEN IF best_stream missing, keep fallback
    const stream = item.best_stream || item.alternatives?.[0];

    if (!stream) return;

    playlist.push({
      title: item.channel,
      url: stream.url,
      group: item.group || 'Uncategorized',
      score: stream.score || 0
    });
  });

  return playlist;
}

module.exports = {
  selectBestStream,
  selectBestStreamsForAll,
  buildFinalPlaylist
};