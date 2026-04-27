/**
 * Utility Functions
 * Helper functions for statistics and logging
 */

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Generate statistics report
 */
function generateStats(rawChannels, normalizedChannels, deduplicatedGroups, finalChannels) {
  return {
    raw_input: {
      channels: rawChannels.length,
      size: rawChannels.reduce((sum, ch) => sum + (ch.url ? ch.url.length : 0), 0)
    },
    after_normalization: {
      channels: normalizedChannels.length
    },
    after_deduplication: {
      unique_channels: deduplicatedGroups.length,
      duplicates_removed: rawChannels.length - deduplicatedGroups.reduce((sum, g) => sum + g.count, 0),
      total_streams: deduplicatedGroups.reduce((sum, g) => sum + g.count, 0)
    },
    final_output: {
      channels: finalChannels.length,
      average_alternatives: deduplicatedGroups.length > 0 ? 
        Math.round(deduplicatedGroups.reduce((sum, g) => sum + g.streams.length, 0) / deduplicatedGroups.length) : 0
    }
  };
}

/**
 * Print progress bar
 */
function printProgressBar(current, total, width = 40) {
  const percentage = current / total;
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  const percent = Math.round(percentage * 100);
  
  process.stdout.write(`\r${bar} ${percent}%`);
}

/**
 * Print section header
 */
function printSectionHeader(text) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60));
}

/**
 * Print statistics table
 */
function printStats(stats) {
  console.log('\n📊 STATISTICS REPORT\n');
  
  console.log('Input:');
  console.log(`  Raw channels: ${stats.raw_input.channels}`);
  console.log(`  Data size: ${formatBytes(stats.raw_input.size)}\n`);
  
  console.log('Deduplication:');
  console.log(`  Unique channels: ${stats.after_deduplication.unique_channels}`);
  console.log(`  Duplicates removed: ${stats.after_deduplication.duplicates_removed}`);
  console.log(`  Total streams: ${stats.after_deduplication.total_streams}\n`);
  
  console.log('Final Output:');
  console.log(`  Channels: ${stats.final_output.channels}`);
  console.log(`  Average alternatives per channel: ${stats.final_output.average_alternatives}\n`);
}

/**
 * Print duration
 */
function printExecutionTime(startTime) {
  const duration = Date.now() - startTime;
  console.log(`⏱️  Execution time: ${formatDuration(duration)}`);
}

module.exports = {
  formatBytes,
  formatDuration,
  generateStats,
  printProgressBar,
  printSectionHeader,
  printStats,
  printExecutionTime
};
