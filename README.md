# LINE MCP Server for Claude Desktop

This is a Model Context Protocol (MCP) server implementation for integrating LINE messaging capabilities with Claude Desktop.

## Features

- Send messages to LINE groups
- Get group profile information
- Retrieve group message history

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Update Claude Desktop configuration:

Edit \`claude_desktop_config.json\`:
- Windows: \`%APPDATA%/Claude/claude_desktop_config.json\`
- macOS: \`~/Library/Application Support/Claude/claude_desktop_config.json\`

Add the following configuration:
```json
{
  "servers": {
    "line-mcp": {
      "command": "node",
      "args": [
        "path/to/dist/index.js"
      ],
      "env": {
        "LINE_CHANNEL_ACCESS_TOKEN": "your_line_channel_access_token"
      }
    }
  }
}
```

4. Set your LINE Channel Access Token in the configuration file

5. Restart Claude Desktop

## Development

Watch mode for development:
```bash
npm run watch
```

## License

MIT