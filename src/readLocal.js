/**
 * Local Playlist Reader
 * Reads all .m3u and .m3u8 files from local folder
 */

const fs = require('fs');
const path = require('path');

const LOCAL_PLAYLIST_DIR = path.join(__dirname, '../IPTV PLAYLIST');

function readLocalPlaylists() {
  const playlists = [];
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(LOCAL_PLAYLIST_DIR)) {
    fs.mkdirSync(LOCAL_PLAYLIST_DIR, { recursive: true });
    console.log(`Created local playlist directory: ${LOCAL_PLAYLIST_DIR}`);
    return playlists;
  }
  
  try {
    const files = fs.readdirSync(LOCAL_PLAYLIST_DIR);
    
    files.forEach(file => {
      if (file.endsWith('.m3u') || file.endsWith('.m3u8')) {
        try {
          const filePath = path.join(LOCAL_PLAYLIST_DIR, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          playlists.push({
            source: file,
            path: filePath,
            content: content,
            type: 'local'
          });
          
          console.log(`✓ Read local playlist: ${file}`);
        } catch (error) {
          console.error(`✗ Error reading ${file}:`, error.message);
        }
      }
    });
  } catch (error) {
    console.error(`Error reading local playlist directory:`, error.message);
  }
  
  return playlists;
}

module.exports = {
  readLocalPlaylists,
  LOCAL_PLAYLIST_DIR
};
