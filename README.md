# IPTV Playlist Aggregator

A self-improving IPTV aggregation and streaming system that runs in GitHub Codespaces. This system merges multiple IPTV sources, cleans and filters channels, removes duplicates, selects the best working streams, and outputs clean categorized playlists.

## 🚀 Features

- **Multi-source aggregation**: Combines local playlists with remote IPTV sources
- **Intelligent deduplication**: Removes duplicate channels based on normalized titles
- **Stream health checking**: Tests stream availability and measures latency
- **AI-style ranking**: Scores streams using multiple criteria (latency, reliability, source reputation)
- **Auto-healing**: Automatically replaces dead streams with working alternatives
- **Smart classification**: Categorizes channels into sports, movies, news, kids, Korea/Asian, US/series, etc.
- **Multiple output formats**: Generates M3U playlists and JSON catalogs
- **VLC compatible**: All playlists work directly in VLC media player
- **GitHub integration**: Designed to run in Codespaces and serve via GitHub raw URLs

## 📁 Project Structure

```
iptv-playlist/
├── src/
│   ├── build.js              # Main orchestration script
│   ├── readLocal.js          # Local playlist reader
│   ├── fetchRemote.js        # Remote source fetcher
│   ├── parser.js             # M3U playlist parser
│   ├── normalize.js          # Channel name normalization
│   ├── deduplicate.js        # Duplicate detection and grouping
│   ├── healthChecker.js      # Stream health testing
│   ├── bestStreamSelector.js # Best stream selection logic
│   ├── classifier.js         # Channel categorization
│   ├── outputGenerator.js    # M3U/JSON output generation
│   └── utils.js              # Utility functions
├── IPTV PLAYLIST/            # Local playlist files (.m3u, .m3u8)
├── output/                   # Generated playlists and catalogs
│   ├── catalog.m3u          # Main playlist (all channels)
│   ├── sports.m3u           # Sports channels
│   ├── movies.m3u           # Movie channels
│   ├── news.m3u             # News channels
│   ├── korea.m3u            # Korean content
│   ├── us-series.m3u        # US TV series
│   ├── catalog.json         # JSON catalog for apps
│   └── summary.json         # Build statistics
├── package.json
└── README.md
```

## 🛠️ Installation & Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/yourusername/iptv-playlist.git
   cd iptv-playlist
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add local playlists** (optional):
   Place your `.m3u` or `.m3u8` files in the `IPTV PLAYLIST/` directory.

## 🚀 Usage

### Basic Build (Recommended)
Run the full pipeline with health checking:
```bash
npm start
# or
node src/build.js
```

### Quick Build (Skip Health Check)
For faster builds without stream testing:
```bash
node src/build.js --skip-health-check
```

### Verbose Mode
See detailed progress information:
```bash
node src/build.js --verbose
```

## 📊 Build Process

The system runs through 8 main steps:

1. **📂 FETCH SOURCES**: Reads local playlists and fetches remote IPTV sources
2. **📝 PARSE PLAYLISTS**: Extracts channel information from M3U files
3. **🔤 NORMALIZE**: Cleans channel names and extracts metadata
4. **🔍 DEDUPLICATE**: Groups duplicate channels by normalized titles
5. **🏥 HEALTH CHECK**: Tests stream URLs for availability and latency
6. **🏆 SELECT BEST STREAMS**: Chooses optimal streams using scoring algorithm
7. **🏷️ CLASSIFY**: Categorizes channels into content types
8. **💾 GENERATE OUTPUTS**: Creates M3U playlists and JSON catalogs

## 📺 Using the Playlists

### VLC Media Player
1. Open VLC
2. Media → Open Network Stream
3. Enter URL: `https://raw.githubusercontent.com/yourusername/iptv-playlist/main/output/catalog.m3u`
4. Click Play

### Category-Specific Playlists
- **All Channels**: `catalog.m3u`
- **Sports**: `sports.m3u`
- **Movies**: `movies.m3u`
- **News**: `news.m3u`
- **Korean Content**: `korea.m3u`
- **US Series**: `us-series.m3u`
- **Kids**: `kids.m3u`

### JSON Catalog for Apps
The `catalog.json` file provides structured data for custom streaming applications.

## 🔧 Configuration

### Remote Sources
Edit `src/fetchRemote.js` to add or modify remote IPTV sources:

```javascript
const REMOTE_SOURCES = [
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://your-custom-source.com/playlist.m3u',
  // Add more sources here
];
```

### Categories
Modify channel classification in `src/classifier.js`:

```javascript
const categoryKeywords = {
  'sports': ['sports', 'football', 'soccer', 'nba', 'nfl'],
  'movies': ['movie', 'cinema', 'film', 'hbo'],
  // Add custom categories
};
```

## 📈 Statistics & Monitoring

After each build, check `output/summary.json` for detailed statistics:
- Total channels processed
- Duplication rates
- Category distribution
- Health check results

## 🔄 Automation

### GitHub Actions (Recommended)
Set up automatic daily builds:

```yaml
# .github/workflows/build.yml
name: Build IPTV Playlists
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node src/build.js
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: 'Update IPTV playlists'
```

### Manual Updates
Run builds manually in GitHub Codespaces or locally.

## 🛡️ Security & Legal

- **Content Responsibility**: This tool aggregates publicly available IPTV sources. Users are responsible for content legality in their jurisdiction.
- **Rate Limiting**: Built-in delays prevent overwhelming remote servers.
- **No Storage**: The system processes streams in memory without permanent storage.

## 🐛 Troubleshooting

### Common Issues

**Build fails with network errors:**
- Some remote sources may be temporarily unavailable
- Check internet connection and retry

**Empty playlists:**
- Verify local playlist files are in `IPTV PLAYLIST/` directory
- Check remote source URLs are accessible

**VLC won't play streams:**
- Some streams may require specific codecs or geographic access
- Try different streams for the same channel

### Debug Mode
Run with verbose logging:
```bash
node src/build.js --verbose
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Future Enhancements

- [ ] Web-based playlist browser
- [ ] Mobile app companion
- [ ] Advanced stream quality analysis
- [ ] Geographic content filtering
- [ ] Custom category creation
- [ ] Playlist sharing features

---

**Note**: This system is designed for personal use and content aggregation. Always respect copyright laws and terms of service for streaming content.
