# @dkta0/extract-mcp

MCP server for [extract.dkta.dev](https://extract.dkta.dev) — clean content extraction for AI agents via x402.

Extract readable markdown from any URL. Each call costs **$0.001 USDC** paid automatically on Base mainnet via the [x402 protocol](https://x402.org).

## Installation

```bash
npx -y @dkta0/extract-mcp
```

## Prerequisites

An EVM wallet private key with USDC on Base mainnet (for per-call payments).

## Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "extract": {
      "command": "npx",
      "args": ["-y", "@dkta0/extract-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xyour_private_key_here"
      }
    }
  }
}
```

## Tools

### `extract_webpage`
Extract clean readable text from a single URL.
- `url` (required): The URL to extract content from

### `extract_webpage_batch`
Extract clean readable text from multiple URLs (up to 5) in a single call.
- `urls` (required): Array of URLs (max 5)

## How It Works

1. The MCP client calls `extract_webpage` or `extract_webpage_batch` with URL(s).
2. The server sends a request to `https://extract.dkta.dev`.
3. If the server responds with HTTP 402, `x402-fetch` automatically pays $0.001 USDC per URL on Base mainnet.
4. The extracted markdown is returned to the client.
