/**
 * M3U Playlist Parser
 * Extracts channel information from EXTINF entries
 */

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse EXTINF line
    if (line.startsWith('#EXTINF:')) {
      const extinf = line;
      
      // Extract duration (first number after #EXTINF:)
      const durationMatch = extinf.match(/#EXTINF:(-?\d+)/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : -1;
      
      // Extract attributes and title
      // Format: #EXTINF:-1 tvg-id="id" tvg-name="name" tvg-logo="logo" group-title="group", Title
      const attributesMatch = extinf.match(/#EXTINF:[^,]*(?:tvg-id="([^"]*)")?[^,]*(?:tvg-name="([^"]*)")?[^,]*(?:tvg-logo="([^"]*)")?[^,]*(?:group-title="([^"]*)")?[^,]*,(.*)$/);
      
      const title = attributesMatch ? attributesMatch[5].trim() : '';
      const tvgId = attributesMatch ? attributesMatch[1] : '';
      const tvgName = attributesMatch ? attributesMatch[2] : '';
      const tvgLogo = attributesMatch ? attributesMatch[3] : '';
      const groupTitle = attributesMatch ? attributesMatch[4] : 'Uncategorized';
      
      // Get URL from next line
      let url = '';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          url = nextLine;
          i++; // Skip the URL line
        }
      }
      
      if (title && url) {
        channels.push({
          title: title.trim(),
          url: url,
          tvgId: tvgId || '',
          tvgName: tvgName || title,
          tvgLogo: tvgLogo || '',
          groupTitle: groupTitle || 'Uncategorized',
          duration: duration
        });
      }
    }
  }
  
  return channels;
}

/**
 * Parse multiple playlist contents
 */
function parseMultipleM3U(contents) {
  const allChannels = [];
  
  contents.forEach((content, index) => {
    try {
      const channels = parseM3U(content);
      allChannels.push(...channels);
    } catch (error) {
      console.error(`Error parsing playlist ${index}:`, error.message);
    }
  });
  
  return allChannels;
}

module.exports = {
  parseM3U,
  parseMultipleM3U
};
