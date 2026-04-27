/**
 * Output Generator
 * Generates M3U playlists and JSON catalog
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../output');

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Generate M3U header
 */
function generateM3UHeader() {
  return '#EXTM3U\n';
}

/**
 * Generate EXTINF line for a channel
 */
function generateEXTINF(channel) {
  const tvgId = channel.tvgId || '';
  const tvgName = channel.tvgName || channel.title;
  const tvgLogo = channel.tvgLogo || '';
  const groupTitle = channel.group || 'Uncategorized';
  
  let extinf = '#EXTINF:-1';
  
  if (tvgId) extinf += ` tvg-id="${tvgId}"`;
  if (tvgName) extinf += ` tvg-name="${tvgName}"`;
  if (tvgLogo) extinf += ` tvg-logo="${tvgLogo}"`;
  if (groupTitle) extinf += ` group-title="${groupTitle}"`;
  
  extinf += `\n${channel.title}\n${channel.url}\n`;
  
  return extinf;
}

/**
 * Generate M3U playlist
 */
function generateM3U(channels) {
  let m3u = generateM3UHeader();
  
  channels.forEach(channel => {
    m3u += generateEXTINF(channel);
  });
  
  return m3u;
}

/**
 * Write M3U file
 */
function writeM3UFile(filename, channels) {
  ensureOutputDir();
  
  const filepath = path.join(OUTPUT_DIR, filename);
  const content = generateM3U(channels);
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✓ Generated playlist: ${filename} (${channels.length} channels)`);
  
  return filepath;
}

/**
 * Write multiple M3U files for different categories
 */
function writeM3UByCategory(categorized) {
  ensureOutputDir();
  
  const files = [];
  
  for (const [category, channels] of Object.entries(categorized)) {
    if (channels.length > 0) {
      const filename = `${category}.m3u`;
      const filepath = writeM3UFile(filename, channels);
      
      files.push({
        category: category,
        filename: filename,
        filepath: filepath,
        channel_count: channels.length
      });
    }
  }
  
  return files;
}

/**
 * Generate JSON catalog
 */
function generateJSONCatalog(channels) {
  const catalog = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    total_channels: channels.length,
    channels: channels.map(ch => ({
      title: ch.title,
      url: ch.url,
      group: ch.group || 'Uncategorized',
      tvgId: ch.tvgId || '',
      tvgName: ch.tvgName || '',
      tvgLogo: ch.tvgLogo || '',
      source: ch.source || 'unknown',
      health: ch.health || {
        alive: null,
        latency: null
      }
    }))
  };
  
  return catalog;
}

/**
 * Write JSON catalog
 */
function writeJSONFile(filename, data) {
  ensureOutputDir();
  
  const filepath = path.join(OUTPUT_DIR, filename);
  const content = JSON.stringify(data, null, 2);
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✓ Generated catalog: ${filename}`);
  
  return filepath;
}

/**
 * Generate and write all outputs
 */
function generateAllOutputs(channels, categorized) {
  ensureOutputDir();
  
  const outputs = {
    m3u_files: [],
    json_files: [],
    summary: {}
  };
  
  // Write main catalog
  const allChannels = channels.length > 0 ? channels : 
    Object.values(categorized).flat();
  
  outputs.m3u_files.push(writeM3UFile('catalog.m3u', allChannels));
  
  // Write categorized playlists
  const categoryFiles = writeM3UByCategory(categorized);
  outputs.m3u_files.push(...categoryFiles.map(f => f.filepath));
  
  // Write JSON catalog
  const jsonCatalog = generateJSONCatalog(allChannels);
  outputs.json_files.push(writeJSONFile('catalog.json', jsonCatalog));
  
  // Write summary
  const summary = {
    generated: new Date().toISOString(),
    total_channels: allChannels.length,
    output_format: '1.0.0',
    files: {
      m3u: categoryFiles.map(f => f.filename),
      json: ['catalog.json']
    },
    categories: Object.keys(categorized)
  };
  
  outputs.json_files.push(writeJSONFile('summary.json', summary));
  
  return outputs;
}

module.exports = {
  generateM3U,
  writeM3UFile,
  writeM3UByCategory,
  generateJSONCatalog,
  writeJSONFile,
  generateAllOutputs,
  ensureOutputDir,
  OUTPUT_DIR
};
