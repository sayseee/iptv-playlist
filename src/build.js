#!/usr/bin/env node

/**
 * IPTV Aggregator Main Build Script
 * Orchestrates the entire pipeline: fetch, parse, clean, deduplicate, health check, rank, classify, generate
 */

const fs = require('fs');
const path = require('path');

// Import all modules
const { readLocalPlaylists } = require('./readLocal');
const { fetchRemoteSources } = require('./fetchRemote');
const { parseM3U, parseMultipleM3U } = require('./parser');
const { normalizeChannels, groupSimilarChannels } = require('./normalize');
const { deduplicateChannels, getDuplicationStats } = require('./deduplicate');
const { checkStreamsHealth, rankStreams } = require('./healthChecker');
const { selectBestStreamsForAll, buildFinalPlaylist } = require('./bestStreamSelector');
const { groupChannelsByCategory, getCategoryStats } = require('./classifier');
const { generateAllOutputs } = require('./outputGenerator');
const { printSectionHeader, printStats, printExecutionTime, generateStats, formatDuration } = require('./utils');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const skipHealthCheck = args.includes('--skip-health-check');

// Main execution
async function main() {
  try {
    const startTime = Date.now();
    console.log('🚀 IPTV Playlist Aggregator v1.0.0\n');
    
    // ========== STEP 1: FETCH SOURCES ==========
    printSectionHeader('STEP 1: FETCHING SOURCES');
    
    // Read local playlists
    console.log('\n📂 Reading local playlists...');
    const localPlaylists = readLocalPlaylists();
    console.log(`   Found ${localPlaylists.length} local playlist(s)`);
    
    // Fetch remote sources
    console.log('\n🌐 Fetching remote IPTV sources...');
    const remotePlaylists = await fetchRemoteSources();
    console.log(`   Retrieved ${remotePlaylists.length} remote source(s)`);
    
    // Combine all sources
    const allPlaylists = [...localPlaylists, ...remotePlaylists];
    if (allPlaylists.length === 0) {
      console.log('⚠️  No playlists found! Make sure to add files to IPTV PLAYLIST/ folder or check remote sources.');
      process.exit(1);
    }
    
    // ========== STEP 2: PARSE PLAYLISTS ==========
    printSectionHeader('STEP 2: PARSING PLAYLISTS');
    
    console.log('\n📝 Parsing all playlists...');
    const contents = allPlaylists.map(p => p.content);
    let rawChannels = parseMultipleM3U(contents);
    
    console.log(`✓ Parsed ${rawChannels.length} raw channel entries`);
    if (verbose) {
      console.log(`  Sample channels:`);
      rawChannels.slice(0, 3).forEach(ch => {
        console.log(`    - ${ch.title} (${ch.groupTitle})`);
      });
    }
    
    // ========== STEP 3: NORMALIZE ==========
    printSectionHeader('STEP 3: NORMALIZING CHANNELS');
    
    console.log('\n🔤 Normalizing channel names and extracting metadata...');
    const normalizedChannels = normalizeChannels(rawChannels);
    console.log(`✓ Normalized ${normalizedChannels.length} channels`);
    
    // ========== STEP 4: DEDUPLICATE ==========
    printSectionHeader('STEP 4: DEDUPLICATING CHANNELS');
    
    console.log('\n🔍 Detecting and grouping duplicates...');
    const deduplicatedGroups = deduplicateChannels(normalizedChannels);
    const dupStats = getDuplicationStats(deduplicatedGroups);
    
    console.log(`✓ Found ${dupStats.unique_channels} unique channels`);
    console.log(`  Total entries: ${dupStats.total_channels}`);
    console.log(`  Duplicates: ${dupStats.duplicate_entries} (${dupStats.deduplication_ratio})`);
    
    // ========== STEP 5: HEALTH CHECK (OPTIONAL) ==========
    let healthResults = [];
    if (!skipHealthCheck) {
      printSectionHeader('STEP 5: CHECKING STREAM HEALTH');
      
      // Collect all unique URLs
      const allUrls = [];
      const urlSet = new Set();
      deduplicatedGroups.forEach(group => {
        group.streams.forEach(alt => {
          if (!urlSet.has(alt.url)) {
            urlSet.add(alt.url);
            allUrls.push(alt);
          }
        });
      });
      
      if (allUrls.length > 0) {
        console.log(`\n🏥 Testing ${allUrls.length} stream URLs for health and latency...`);
        console.log('   (This may take a few minutes)\n');
        
        const batchSize = 5;
        const startHealthCheck = Date.now();
        
        healthResults = await checkStreamsHealth(allUrls, batchSize, 5000);
        
        const healthTime = formatDuration(Date.now() - startHealthCheck);
        const aliveCount = healthResults.filter(h => h.alive).length;
        const deadCount = healthResults.length - aliveCount;
        
        console.log(`\n✓ Health check completed in ${healthTime}`);
        console.log(`  Alive streams: ${aliveCount}`);
        console.log(`  Dead streams: ${deadCount}`);
        console.log(`  Success rate: ${((aliveCount / healthResults.length) * 100).toFixed(1)}%`);
        
        if (verbose && healthResults.length > 0) {
          const avgLatency = Math.round(
            healthResults
              .filter(h => h.alive)
              .reduce((sum, h) => sum + h.latency, 0) / aliveCount
          );
          console.log(`  Average latency (alive): ${avgLatency}ms`);
        }
      }
    } else {
      console.log('\n⏭️  Skipping health check (use --skip-health-check to disable)\n');
    }
    
    // ========== STEP 6: SELECT BEST STREAMS ==========
    printSectionHeader('STEP 6: SELECTING BEST STREAMS');
    
    console.log('\n🏆 Selecting best stream for each channel...');
    const selectedStreams = selectBestStreamsForAll(deduplicatedGroups, healthResults);
    const finalPlaylist = buildFinalPlaylist(selectedStreams);
    
    console.log(`✓ Selected best streams for ${finalPlaylist.length} channels`);
    
    // ========== STEP 7: CLASSIFY CHANNELS ==========
    printSectionHeader('STEP 7: CLASSIFYING CHANNELS');
    
    console.log('\n🏷️  Classifying channels into categories...');
    const categorized = groupChannelsByCategory(finalPlaylist);
    const categoryStats = getCategoryStats(categorized);
    
    console.log(`✓ Classified into ${categoryStats.unique_categories} categories:`);
    Object.entries(categoryStats.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([category, count]) => {
        console.log(`  - ${category}: ${count} channels`);
      });
    
    // ========== STEP 8: GENERATE OUTPUTS ==========
    printSectionHeader('STEP 8: GENERATING OUTPUTS');
    
    console.log('\n💾 Generating M3U playlists and JSON catalog...');
    const outputs = generateAllOutputs(finalPlaylist, categorized);
    
    console.log(`✓ Generated ${outputs.m3u_files.length + outputs.json_files.length} output files`);
    
    // ========== FINAL REPORT ==========
    printSectionHeader('BUILD SUMMARY');
    
    const stats = generateStats(rawChannels, normalizedChannels, deduplicatedGroups, finalPlaylist);
    printStats(stats);
    
    console.log('📂 Output Files:');
    console.log(`   Location: ${path.resolve(path.join(__dirname, '../output'))}`);
    console.log(`   - catalog.m3u (Main playlist with all channels)`);
    Object.keys(categorized).forEach(category => {
      const count = categorized[category].length;
      if (count > 0) {
        console.log(`   - ${category}.m3u (${count} channels)`);
      }
    });
    console.log(`   - catalog.json (JSON catalog for app integration)`);
    console.log(`   - summary.json (Build summary)\n`);
    
    console.log('✨ Build completed successfully!');
    printExecutionTime(startTime);
    
    console.log('\n🎬 Next steps:');
    console.log('   1. Commit output files to GitHub');
    console.log('   2. Access via: https://raw.githubusercontent.com/<user>/<repo>/output/catalog.m3u');
    console.log('   3. Open in VLC or your streaming app\n');
    
  } catch (error) {
    console.error('\n❌ Build failed with error:');
    console.error(error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
