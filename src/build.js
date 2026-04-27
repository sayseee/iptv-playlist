#!/usr/bin/env node

const path = require('path');

const { readLocalPlaylists } = require('./readLocal');
const { fetchRemoteSources } = require('./fetchRemote');
const { parseMultipleM3U } = require('./parser');
const { normalizeChannels } = require('./normalize');
const { deduplicateChannels, getDuplicationStats } = require('./deduplicate');
const { checkStreamsHealth } = require('./healthChecker');
const { selectBestStreamsForAll, buildFinalPlaylist } = require('./bestStreamSelector');
const { groupChannelsByCategory, getCategoryStats } = require('./classifier');
const { generateAllOutputs } = require('./outputGenerator');
const { printSectionHeader, printStats, printExecutionTime, generateStats, formatDuration } = require('./utils');

const args = process.argv.slice(2);
const skipHealthCheck = args.includes('--skip-health-check');

async function main() {
  try {
    const startTime = Date.now();
    console.log('🚀 IPTV Playlist Aggregator v2.1.0\n');

    // STEP 1
    printSectionHeader('STEP 1: FETCHING SOURCES');

    const localPlaylists = readLocalPlaylists();
    const remotePlaylists = await fetchRemoteSources();
    const allPlaylists = [...localPlaylists, ...remotePlaylists];

    if (!allPlaylists.length) {
      console.log('❌ No playlists found');
      process.exit(1);
    }

    // STEP 2
    printSectionHeader('STEP 2: PARSING');

    const rawChannels = parseMultipleM3U(allPlaylists.map(p => p.content));
    console.log(`✓ Parsed ${rawChannels.length}`);

    // STEP 3
    printSectionHeader('STEP 3: NORMALIZING');

    const normalized = normalizeChannels(rawChannels);

    // STEP 4
    printSectionHeader('STEP 4: DEDUPLICATION');

    const groups = deduplicateChannels(normalized);

    const dupStats = getDuplicationStats(groups);
    console.log(`✓ Unique: ${dupStats.unique_channels}`);

    // STEP 5 (SAFE HEALTH)
    let healthResults = [];

    if (!skipHealthCheck) {
      printSectionHeader('STEP 5: HEALTH CHECK');
      const urls = [];

      groups.forEach(g => {
        g.streams.slice(0, 3).forEach(s => urls.push(s));
      });

      healthResults = await checkStreamsHealth(urls, 5, 5000);
    }

    // STEP 6
    printSectionHeader('STEP 6: SELECT BEST STREAMS');

    const selected = selectBestStreamsForAll(groups, healthResults);

    // 🔥 CRITICAL FIX: NEVER ALLOW EMPTY PIPELINE
    const safeSelected = selected.filter(s => s && s.best_stream);

    const finalPlaylist = buildFinalPlaylist(safeSelected);

    console.log(`✓ Final channels: ${finalPlaylist.length}`);

    // STEP 7
    printSectionHeader('STEP 7: CLASSIFICATION');

    const categorized = groupChannelsByCategory(finalPlaylist);
    const catStats = getCategoryStats(categorized);

    console.log(`✓ Categories: ${catStats.unique_categories}`);

    // STEP 8
    printSectionHeader('STEP 8: OUTPUT');

    generateAllOutputs(finalPlaylist, categorized);

    // SUMMARY
    printSectionHeader('SUMMARY');

    const stats = generateStats(rawChannels, normalized, groups, finalPlaylist);
    printStats(stats);

    printExecutionTime(startTime);

  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

main();