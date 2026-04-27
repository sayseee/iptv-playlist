/**
 * Channel Classifier
 * Categorizes channels into different categories based on keywords
 */

const categoryKeywords = {
  'sports': [
    'sports', 'sport', 'espn', 'nba', 'nfl', 'nhl', 'nascar',
    'beinsports', 'bein', 'eurosport', 'skysports', 'sky sports',
    'football', 'soccer', 'basketball', 'hockey', 'baseball',
    'cricket', 'tennis', 'golf', 'boxing', 'mma', 'ufc',
    'formula1', 'f1', 'moto', 'motogp', 'darts', 'snooker'
  ],
  'movies': [
    'movie', 'movies', 'cinema', 'film', 'hbo', 'paramount',
    'universal', 'warner', 'sony', 'mgm', 'disney', 'fox',
    'action', 'thriller', 'horror', 'comedy', 'drama',
    'romance', 'animation', 'bollywood', 'hollywood'
  ],
  'news': [
    'news', 'news24', 'bbc', 'cnn', 'al jazeera', 'aljazeera',
    'rt', 'russia today', 'france24', 'dw', 'euronews',
    'sky news', 'abc news', 'nbc news', 'cbs news', 'channel',
    'channel 7', 'channel 9', 'channel 10', 'news network'
  ],
  'kids': [
    'kids', 'children', 'cartoon', 'cartoon network',
    'nickelodeon', 'disney channel', 'disney junior', 'boomerang',
    'baby', 'junior', 'kids +', 'kids+', 'junior +', 'junior+'
  ],
  'korea': [
    'korean', 'korea', 'kbs', 'mbc', 'sbs', 'tvn',
    'jtbc', 'ebs', '한글', '한국', 'hangul',
    'kftc', 'ktv', 'onstyle', 'tvchosun', 'chosun'
  ],
  'asian': [
    'japan', 'japanese', 'nhk', 'china', 'chinese',
    'taiwan', 'taiwanese', 'hong kong', 'vietnam', 'thai',
    'thailand', 'philippines', 'cctv', '中文', '日本'
  ],
  'us-series': [
    'usa', 'us ', 'united states', 'american', 'america',
    'hulu', 'netflix', 'prime', 'amazon', 'amc+',
    'series', 'tv show', 'sitcom', 'drama series',
    'nbc', 'abc', 'cbs', 'fox', 'tnt', 'tbs', 'usa network'
  ],
  'documentaries': [
    'documentary', 'documentaries', 'discovery', 'nat geo',
    'national geographic', 'bbc', 'history', 'science'
  ],
  'entertainment': [
    'entertainment', 'variety', 'talk show', 'music',
    'mtv', 'vh1', 'e!', 'bravo', 'tlc', 'lifestyle'
  ],
  'religious': [
    'religious', 'religion', 'church', 'gospel', 'prayer',
    'inspired', 'trinity', 'bvn', 'daystar', 'tvn', 'ctv'
  ],
  'music': [
    'music', 'radio', 'mtv', 'vh1', 'vevo', 'tmf', 'much'
  ]
};

/**
 * Classify a channel into categories
 */
function classifyChannel(title, group = '') {
  const combined = `${title} ${group}`.toLowerCase();
  const categories = [];
  
  // Check each category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    // Check if any keyword matches
    if (keywords.some(keyword => combined.includes(keyword.toLowerCase()))) {
      categories.push(category);
    }
  }
  
  // If no categories found, use the provided group or default
  if (categories.length === 0) {
    if (group && group !== 'Uncategorized') {
      categories.push(group.toLowerCase());
    } else {
      categories.push('general');
    }
  }
  
  return categories;
}

/**
 * Group channels by category
 */
function groupChannelsByCategory(channels) {
  const grouped = {};
  
  channels.forEach(channel => {
    const categories = classifyChannel(channel.title, channel.group);
    
    categories.forEach(category => {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(channel);
    });
  });
  
  // Sort each category alphabetically
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.title.localeCompare(b.title));
  });
  
  return grouped;
}

/**
 * Get category statistics
 */
function getCategoryStats(categorized) {
  const stats = {};
  let totalChannels = 0;
  
  for (const [category, channels] of Object.entries(categorized)) {
    stats[category] = channels.length;
    totalChannels += channels.length;
  }
  
  return {
    categories: stats,
    total: totalChannels,
    unique_categories: Object.keys(stats).length
  };
}

module.exports = {
  classifyChannel,
  groupChannelsByCategory,
  getCategoryStats,
  categoryKeywords
};
