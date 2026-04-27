#!/usr/bin/env node

/**
 * IPTV Aggregator Main Build Script (Advanced)
 * Geo-aware, performance-optimized, production-ready pipeline
 */

const fs = require('fs');
const path = require('path');

// Modules
const { readLocalPlaylists } = require('./readLocal');
const { fetchRemoteSources } = require('./fetchRemote');
const { parseMultipleM3U } = require('./parser');
const { normalizeChannels } = require('./normalize');
const { deduplicateChannels, getDuplicationStats } = require('./deduplicate');
const { checkStreamsHealth, rankStreams } = require('./healthChecker');
const { selectBestStreamsForAll, buildFinalPlaylist } = require('./bestStreamSelector');
const { groupChannelsByCategory, getCategoryStats } = require('./classifier');
const { generateAllOutputs } = require('./outputGenerator');
const { printSectionHeader, printStats, printExecutionTime, generateStats, formatDuration } = require('./utils');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const skipHealthCheck = args.includes('--skip-health-check');

const MAX_STREAMS_PER_CHANNEL = 5;

// MAIN
async function main() {
  try {
    const startTime = Date.now();
    console.log('🚀 IPTV Playlist Aggregator v2.0.0\n');

    // ========== STEP 1: FETCH ==========
    printSectionHeader('STEP 1: FETCHING SOURCES');

    const localPlaylists = readLocalPlaylists();
    console.log(`📂 Local playlists: ${localPlaylists.length}`);

    const remotePlaylists = await fetchRemoteSources();
    console.log(`🌐 Remote sources: ${remotePlaylists.length}`);

    const allPlaylists = [...localPlaylists, ...remotePlaylists];

    if (allPlaylists.length === 0) {
      console.log('❌ No playlists found.');
      process.exit(1);
    }

    // ========== STEP 2: PARSE ==========
    printSectionHeader('STEP 2: PARSING');

    const contents = allPlaylists.map(p => p.content);
    const rawChannels = parseMultipleM3U(contents);

    console.log(`✓ Parsed ${rawChannels.length} channels`);

    // ========== STEP 3: NORMALIZE ==========
    printSectionHeader('STEP 3: NORMALIZING');

    const normalizedChannels = normalizeChannels(rawChannels);
    console.log(`✓ Normalized ${normalizedChannels.length}`);

    // ========== STEP 4: DEDUP ==========
    printSectionHeader('STEP 4: DEDUPLICATION');

    const deduplicatedGroups = deduplicateChannels(normalizedChannels);
    const dupStats = getDuplicationStats(deduplicatedGroups);

    console.log(`✓ Unique channels: ${dupStats.unique_channels}`);
    console.log(`  Duplicates removed: ${dupStats.duplicate_entries}`);

    // ========== STEP 5: HEALTH CHECK ==========
    let healthResults = [];
    let healthMap = new Map();

    if (!skipHealthCheck) {
      printSectionHeader('STEP 5: HEALTH CHECK');

      const allUrls = [];
      const urlSet = new Set();

      // Limit streams per channel
      deduplicatedGroups.forEach(group => {
        group.streams
          .slice(0, MAX_STREAMS_PER_CHANNEL)
          .forEach(stream => {
            if (!urlSet.has(stream.url)) {
              urlSet.add(stream.url);
              allUrls.push(stream);
            }
          });
      });

      console.log(`🏥 Testing ${allUrls.length} streams...\n`);

      const startHealth = Date.now();
      healthResults = await checkStreamsHealth(allUrls, 5, 5000);

      const duration = formatDuration(Date.now() - startHealth);

      // Build fast lookup map
      healthMap = new Map();
      healthResults.forEach(h => healthMap.set(h.url, h));

      const alive = healthResults.filter(h => h.alive).length;
      const geo = healthResults.filter(h => h.geoBlocked).length;

      const successRate = healthResults.length > 0
        ? ((alive / healthResults.length) * 100).toFixed(1)
        : 0;

      console.log(`✓ Done in ${duration}`);
      console.log(`  Alive: ${alive}`);
      console.log(`  Geo-blocked: ${geo}`);
      console.log(`  Success rate: ${successRate}%`);
    } else {
      console.log('\n⏭️ Skipping health check\n');
    }

    // ========== STEP 6: CLEAN + RANK ==========
    printSectionHeader('STEP 6: CLEANING & RANKING');

    const cleanedGroups = deduplicatedGroups.map(group => {
      let streams = group.streams;

      if (!skipHealthCheck) {
        streams = streams.filter(stream => {
          const health = healthMap.get(stream.url);
          return health && health.alive && !health.geoBlocked;
        });
      }

      const ranked = rankStreams(streams, healthResults);

      return {
        ...group,
        streams: ranked
      };
    });

    // ========== STEP 7: SELECT ==========
    printSectionHeader('STEP 7: SELECTING BEST STREAMS');

    const selectedStreams = selectBestStreamsForAll(cleanedGroups, healthResults);

    const validStreams = selectedStreams.filter(
      s => s && s.best_stream
    );

    const finalPlaylist = buildFinalPlaylist(validStreams);

    console.log(`✓ Final channels: ${finalPlaylist.length}`);

    // ========== STEP 8: CLASSIFY ==========
    printSectionHeader('STEP 8: CLASSIFICATION');

    const categorized = groupChannelsByCategory(finalPlaylist);
    const categoryStats = getCategoryStats(categorized);

    console.log(`✓ Categories: ${categoryStats.unique_categories}`);

    Object.entries(categoryStats.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count}`);
      });

    // ========== STEP 9: OUTPUT ==========
    printSectionHeader('STEP 9: OUTPUT');

    const outputs = generateAllOutputs(finalPlaylist, categorized);

    console.log(`✓ Files generated: ${outputs.m3u_files.length + outputs.json_files.length}`);

    // ========== SUMMARY ==========
    printSectionHeader('SUMMARY');

    const stats = generateStats(
      rawChannels,
      normalizedChannels,
      deduplicatedGroups,
      finalPlaylist
    );

    printStats(stats);

    console.log('\n📂 Output folder:');
    console.log(path.resolve(path.join(__dirname, '../output')));

    console.log('\n✨ Build completed successfully!');
    printExecutionTime(startTime);

  } catch (err) {
    console.error('\n❌ Build failed:');
    console.error(err.message);
    process.exit(1);
  }
}

// RUN
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});