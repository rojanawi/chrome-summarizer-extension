# Chrome AI Summarizer Extension

A Chrome extension that uses Chrome's built-in AI Summarizer API to generate comprehensive summaries of web pages. The extension provides multiple summary formats including headlines, teasers, TL;DR summaries, and key takeaways.

## Features

- **Headline**: Short, punchy title (12 words)
- **Teaser**: Engaging introduction to draw readers in (1 sentence) - *Optional*
- **TL;DR**: Comprehensive summary (5 sentences)
- **Key Takeaways**: Bullet-point list of main points (7 points)

All summaries are generated in parallel for optimal performance.

## Requirements

### Browser Requirements

- **Chrome 138+** (stable version)
- Built-in AI features must be enabled

### Hardware Requirements

- **Operating System**: Windows 10/11, macOS 13+ (Ventura and onwards), Linux, or ChromeOS (Platform 16389.0.0+) on Chromebook Plus devices
- **Storage**: At least 22 GB of free space on the volume containing your Chrome profile
- **GPU**: More than 4 GB of VRAM (recommended)
  - OR **CPU**: 16 GB RAM + 4 CPU cores or more
- **Network**: Unlimited data or unmetered connection (for initial model download)

### Enabling Chrome AI Features

1. Open Chrome and navigate to `chrome://flags`
2. Search for and enable the following flags:
   - `#optimization-guide-on-device-model`
   - `#summarization-api-for-gemini-nano`
3. Restart Chrome
4. Visit `chrome://on-device-internals` to verify Gemini Nano is available

## Installation

### Load as Unpacked Extension

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/chrome-summarizer-extension.git
   cd chrome-summarizer-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **Load unpacked**

5. Select the `extension` folder from this repository

6. The extension icon should now appear in your Chrome toolbar

## Usage

1. Navigate to any web page with substantial text content (articles, blog posts, documentation, etc.)

2. Click the extension icon in your Chrome toolbar

3. Wait for the AI to generate summaries (this may take a few seconds on first use as the model downloads)

4. View the generated summaries:
   - **Headline** at the top
   - **Teaser** in italics (if enabled)
   - **TL;DR** summary
   - **Key Takeaways** at the bottom

## Configuration

You can customize the extension by editing `extension/popup.js`:

```javascript
// Configuration
const CONFIG = {
  enableTeaser: false  // Set to true to enable the teaser section
};
```

### Available Options

- `enableTeaser`: Toggle the teaser section on/off (default: `false`)

## Troubleshooting

### "AI Summarizer API not available"

- Ensure you're using Chrome 138 or later
- Check that AI flags are enabled in `chrome://flags`
- Restart Chrome after enabling flags

### "AI model needs to be downloaded"

- The Gemini Nano model is downloading in the background
- Check progress at `chrome://on-device-internals`
- Ensure you have sufficient storage space (22 GB)
- Wait a few minutes and try again

### "Not enough content to summarize"

- The page must have at least 100 characters of text content
- Try a different page with more substantial content

### Model Not Downloading

- Check your internet connection
- Ensure you're on an unmetered connection (not cellular)
- Verify you have at least 22 GB of free storage space

## Privacy

This extension:

- Processes all content locally using Chrome's built-in AI
- Does not send any data to external servers
- Does not collect or store any user data
- Only accesses the active tab when you click the extension icon

## Technical Details

### API Usage

The extension uses Chrome's Summarizer API with the following configurations:

- **Headline**: `type: 'headline'`, `length: 'short'`, `format: 'plain-text'`
- **Teaser**: `type: 'teaser'`, `length: 'short'`, `format: 'plain-text'`
- **TL;DR**: `type: 'tldr'`, `length: 'long'`, `format: 'plain-text'`
- **Key Points**: `type: 'key-points'`, `length: 'long'`, `format: 'markdown'`

All summarizers run in parallel using `Promise.all()` for optimal performance.

### Permissions

- `activeTab`: Access the current tab's content
- `scripting`: Execute content extraction script on the page

## Development

### Project Structure

```text
chrome-summarizer-extension/
├── extension/
│   ├── manifest.json      # Extension manifest
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Main logic and AI integration
│   └── icon.png           # Extension icon
└── README.md
```

### Making Changes

1. Edit files in the `extension/` directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Resources

- [Chrome Summarizer API Documentation](https://developer.chrome.com/docs/ai/summarizer-api)
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)
- [Gemini Nano](https://deepmind.google/technologies/gemini/nano/)

## License

MIT License - feel free to use and modify as needed.

## Acknowledgments

Built using Chrome's experimental Summarizer API powered by Gemini Nano.
