# Playwriter Setup for Browser Testing

Playwriter is a Chrome extension + CLI that lets AI agents control your actual Chrome browser via Playwright API. This is perfect for testing the volunteer registration flows.

## Installation Steps

### 1. Install Chrome Extension

1. Go to [Chrome Web Store - Playwriter](https://chromewebstore.google.com/detail/playwriter-mcp/jfeammnjpkecdekppnclgkkffahnhfhe)
2. Click "Add to Chrome"
3. The extension icon will appear in your Chrome toolbar

### 2. Install CLI Globally

```bash
npm i -g playwriter
```

### 3. Activate Extension on Tabs

1. Open Chrome
2. Navigate to `http://localhost:3000` (your dev server)
3. Click the **Playwriter extension icon** in the toolbar
4. The icon should turn **green** when connected
5. You'll see an automation banner on the controlled tab

### 4. Verify Installation

```bash
playwriter session new
```

This should output a session ID (e.g., `1`). If you see an error, make sure:
- Chrome is running
- The extension is installed and activated (green icon)
- The Playwriter relay server started automatically

## Usage in Tests

Playwriter uses a **session-based** approach. Each session maintains isolated state.

### Basic Commands

```bash
# Create a new session
playwriter session new  # outputs session ID

# Navigate to a page
playwriter -s 1 -e "await page.goto('http://localhost:3000/volunteer/register')"

# Click an element
playwriter -s 1 -e "await page.locator('input[name=\"phone\"]').fill('03001111111')"

# Get page content
playwriter -s 1 -e "console.log(await page.title())"

# Take screenshot
playwriter -s 1 -e "await page.screenshot({ path: 'test.png' })"
```

### Variables Available

- `page` - The current page/tab
- `context` - Browser context
- `state` - Persistent state object (shared across commands in same session)
- `require` - Node.js require function

## MCP Server Configuration (Optional)

If you want to use Playwriter as an MCP server in Cursor:

1. The Playwriter CLI runs a WebSocket server on `localhost:19988` automatically
2. You can configure it in `.mcp.json` (see below)
3. However, **direct CLI usage in test scripts is simpler** for our use case

### Alternative: Use via Test Scripts

Instead of MCP, we'll create Node.js test scripts that call Playwriter CLI commands. This gives us:
- Better control over test flow
- Easier debugging
- Can combine with our existing integration tests

## Troubleshooting

- **Extension not connecting**: Restart Chrome, ensure extension is enabled
- **Session errors**: Run `playwriter session reset <id>` to reset a session
- **Port conflicts**: Playwriter uses port 19988; ensure nothing else is using it
- **All pages return `about:blank`**: Known Chrome bug - restart Chrome

## Next Steps

Once installed, we'll create automated browser test scripts that use Playwriter to:
1. Navigate to `/volunteer/register`
2. Fill out the form with test data
3. Submit and verify assignment results
4. Test all three scenarios (first-timer, returning, waitlist)
