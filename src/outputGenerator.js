/**
 * Output Generator (CLEAN STABLE VERSION)
 * - Removes geo-blocked streams
 * - Ensures valid M3U output
 * - Prevents corrupted catalog.json
 * - Safe fallback handling
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
 * VALIDATION: Only allow clean playable streams
 */
function isValidChannel(ch) {
  return (
    ch &&
    ch.url &&
    ch.url.startsWith('http') &&
    ch.geoBlocked !== true
  );
}

/**
 * M3U header
 */
function generateM3UHeader() {
  return '#EXTM3U\n';
}

/**
 * EXTINF builder (safe + clean)
 */
function generateEXTINF(channel) {
  const tvgId = channel.tvgId || '';
  const tvgName = channel.tvgName || channel.title || '';
  const tvgLogo = channel.tvgLogo || '';
  const groupTitle = channel.group || 'Uncategorized';

  let extinf = '#EXTINF:-1';

  if (tvgId) extinf += ` tvg-id="${tvgId}"`;
  if (tvgName) extinf += ` tvg-name="${tvgName}"`;
  if (tvgLogo) extinf += ` tvg-logo="${tvgLogo}"`;
  if (groupTitle) extinf += ` group-title="${groupTitle}"`;

  extinf += `,${tvgName}\n${channel.url}\n`;

  return extinf;
}

/**
 * Generate clean M3U playlist
 */
function generateM3U(channels) {
  let m3u = generateM3UHeader();

  const cleanChannels = (channels || []).filter(isValidChannel);

  cleanChannels.forEach(channel => {
    m3u += generateEXTINF(channel);
  });

  return m3u;
}

/**
 * Write M3U file safely
 */
function writeM3UFile(filename, channels) {
  ensureOutputDir();

  const filepath = path.join(OUTPUT_DIR, filename);
  const content = generateM3U(channels);

  fs.writeFileSync(filepath, content, 'utf8');

  console.log(`✓ Generated playlist: ${filename} (${channels.filter(isValidChannel).length} channels)`);

  return filepath;
}

/**
 * Write categorized playlists
 */
function writeM3UByCategory(categorized) {
  ensureOutputDir();

  const files = [];

  for (const [category, channels] of Object.entries(categorized)) {
    const clean = channels.filter(isValidChannel);

    if (clean.length > 0) {
      const filename = `${category}.m3u`;
      const filepath = writeM3UFile(filename, clean);

      files.push({
        category,
        filename,
        filepath,
        channel_count: clean.length
      });
    }
  }

  return files;
}

/**
 * Generate JSON catalog (clean only)
 */
function generateJSONCatalog(channels) {
  const cleanChannels = (channels || []).filter(isValidChannel);

  return {
    version: '1.0.0',
    generated: new Date().toISOString(),
    total_channels: cleanChannels.length,
    channels: cleanChannels.map(ch => ({
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
}

/**
 * Write JSON file
 */
function writeJSONFile(filename, data) {
  ensureOutputDir();

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✓ Generated catalog: ${filename}`);

  return filepath;
}

/**
 * MAIN OUTPUT PIPELINE
 */
function generateAllOutputs(channels, categorized) {
  ensureOutputDir();

  // 🔥 FINAL GLOBAL CLEAN (VERY IMPORTANT)
  const cleanChannels = (channels || []).filter(isValidChannel);

  const outputs = {
    m3u_files: [],
    json_files: [],
    summary: {}
  };

  // 1. MAIN CATALOG
  outputs.m3u_files.push(
    writeM3UFile('catalog.m3u', cleanChannels)
  );

  // 2. CATEGORY FILES
  const categoryFiles = writeM3UByCategory(categorized);
  outputs.m3u_files.push(...categoryFiles.map(f => f.filepath));

  // 3. JSON CATALOG
  const jsonCatalog = generateJSONCatalog(cleanChannels);
  outputs.json_files.push(
    writeJSONFile('catalog.json', jsonCatalog)
  );

  // 4. SUMMARY
  const summary = {
    generated: new Date().toISOString(),
    total_channels: cleanChannels.length,
    output_format: '1.0.0',
    categories: Object.keys(categorized),
    files: {
      m3u: categoryFiles.map(f => f.filename),
      json: ['catalog.json']
    }
  };

  outputs.json_files.push(
    writeJSONFile('summary.json', summary)
  );

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