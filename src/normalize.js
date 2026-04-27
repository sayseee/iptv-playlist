/**
 * Channel Normalization
 * Cleans channel names and groups similar channels
 */

const { detectGeoBlockedMarker, extractRegionRestriction, cleanGeoBlockedTitle } = require('./geoDetector');

/**
 * Normalize channel name for comparison
 * Lowercase, remove special characters, trim whitespace
 */
function normalizeChannelName(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\s+/g, '-'); // Convert spaces to hyphens
}

/**
 * Clean channel title for display
 */
function cleanChannelTitle(title) {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[|•·]/g, '-') // Replace common separators
    .replace(/-{2,}/g, '-'); // Remove multiple dashes
}

/**
 * Extract language from title
 */
function extractLanguage(title) {
  const title_lower = title.toLowerCase();
  
  const languages = {
    'korean': ['korean', 'korea', 'hangul', 'kbs', 'mbc', 'sbs', '한글', '한국'],
    'chinese': ['chinese', 'china', 'cctv', '中文'],
    'japanese': ['japanese', 'japan', 'nhk', '日本'],
    'russian': ['russian', 'russia', 'rtv', 'первый'],
    'arabic': ['arabic', 'arab', 'aljazeera', 'العربية'],
    'spanish': ['spanish', 'spain', 'españa'],
    'french': ['french', 'france', 'fr '],
    'german': ['german', 'germany', 'de '],
    'portuguese': ['portuguese', 'portugal', 'brasil', 'pt'],
    'english': ['english', 'uk', 'usa', 'us', 'uk', 'english']
  };
  
  for (const [lang, keywords] of Object.entries(languages)) {
    if (keywords.some(kw => title_lower.includes(kw))) {
      return lang;
    }
  }
  
  return 'other';
}

/**
 * Normalize channels with grouping
 */
function normalizeChannels(channels) {
  const normalized = channels.map(channel => {
    const hasGeoMarker = detectGeoBlockedMarker(channel.title);
    const regionRestriction = extractRegionRestriction(channel.title);
    const cleanTitle = hasGeoMarker ? cleanGeoBlockedTitle(channel.title) : channel.title;
    
    const normalized_name = normalizeChannelName(cleanTitle);
    const clean_title = cleanChannelTitle(cleanTitle);
    const language = extractLanguage(cleanTitle);
    
    return {
      ...channel,
      normalized_name: normalized_name,
      clean_title: clean_title,
      language: language,
      group: channel.groupTitle || 'Uncategorized',
      geoBlocked: hasGeoMarker,
      regionRestriction: regionRestriction
    };
  });
  
  return normalized;
}

/**
 * Group channels by normalized name
 */
function groupSimilarChannels(channels) {
  const groups = {};
  
  channels.forEach(channel => {
    const key = channel.normalized_name;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(channel);
  });
  
  return groups;
}

module.exports = {
  normalizeChannelName,
  cleanChannelTitle,
  extractLanguage,
  normalizeChannels,
  groupSimilarChannels
};
