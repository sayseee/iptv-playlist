/**
 * Channel Deduplication
 * Detects and groups duplicate channels based on normalized titles
 */

const { normalizeChannelName } = require('./normalize');

/**
 * Deduplicate channels by normalized name
 * Returns array of channel groups where each group represents one logical channel
 */
function deduplicateChannels(channels) {
  const groups = {};
  
  channels.forEach(channel => {
    const key = normalizeChannelName(channel.title);
    
    if (!groups[key]) {
      groups[key] = {
        normalized_name: key,
        display_title: channel.title,
        primary: channel,
        alternatives: [],
        count: 0
      };
    }
    
    // Keep track of all sources
    groups[key].alternatives.push({
      url: channel.url,
      source: channel.source || 'unknown',
      title: channel.title,
      group: channel.group || 'Uncategorized',
      tvgId: channel.tvgId || '',
      tvgLogo: channel.tvgLogo || ''
    });
    
    groups[key].count++;
  });
  
  // Convert to the expected format for bestStreamSelector
  return Object.values(groups).map(group => ({
    name: selectBestTitle(group.alternatives),
    normalized_name: group.normalized_name,
    count: group.count,
    streams: group.alternatives,
    primary_stream: group.primary.url,
    group: group.primary.group || 'Uncategorized'
  }));
}

/**
 * Select representative title from duplicates
 * Prefer official names and shorter titles
 */
function selectBestTitle(duplicates) {
  if (!duplicates || duplicates.length === 0) return '';
  
  // Sort by title length (shorter usually more official)
  return duplicates
    .sort((a, b) => a.title.length - b.title.length)[0]
    .title;
}

/**
 * Merge channel groups
 */
function mergeChannelGroups(groups) {
  return groups.map(group => ({
    name: selectBestTitle(group.alternatives),
    normalized_name: group.normalized_name,
    count: group.count,
    streams: group.alternatives,
    primary_stream: group.primary.url,
    group: group.primary.group || 'Uncategorized'
  }));
}

/**
 * Get statistics about duplication
 */
function getDuplicationStats(groups) {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const unique = groups.length;
  const duplicates = total - unique;
  
  return {
    total_channels: total,
    unique_channels: unique,
    duplicate_entries: duplicates,
    deduplication_ratio: ((duplicates / total) * 100).toFixed(2) + '%'
  };
}

module.exports = {
  deduplicateChannels,
  selectBestTitle,
  mergeChannelGroups,
  getDuplicationStats
};
