# Extract MCP

MCP server for [extract.dkta.dev](https://extract.dkta.dev) — clean content extraction for AI agents via x402.

Extract readable markdown from public URLs. A single call costs **$0.001 USDC**; a batch of 1 to 5 URLs costs a flat **$0.005 USDC**. Payments are automatic on Base mainnet via the [x402 protocol](https://x402.org).

## Installation

```bash
npx --yes github:dkta-labs/extract-mcp
```

## Prerequisites

An EVM wallet private key with enough USDC on Base mainnet for per-call payments. Treat the key as a spending credential; use a dedicated, minimally funded wallet.

## Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "extract": {
      "command": "npx",
      "args": ["--yes", "github:dkta-labs/extract-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xyour_private_key_here"
      }
    }
  }
}
```

## Tools

### `extract_webpage`
Extract clean readable text from a single public HTTP(S) URL for $0.001 USDC.
- `url` (required): The URL to extract content from

### `extract_webpage_batch`
Extract clean readable text from 1 to 5 URLs in a single call for a flat $0.005 USDC.
- `urls` (required): Array of 1 to 5 URLs

## How It Works

1. The MCP client calls `extract_webpage` or `extract_webpage_batch` with URL(s).
2. The server validates the request and public targets before payment.
3. The server responds with HTTP 402; `x402-fetch` pays $0.001 for a single call or $0.005 for a batch on Base mainnet and retries with the same request ID.
4. The server extracts with Crawl4AI and falls back to Mozilla Readability.
5. The structured result is returned to the MCP client.
 
A single extraction settles only after a successful response; a 4xx/5xx single-extraction response is not settled. A batch settles on its HTTP 200 response, including when individual results contain inline errors. Direct local/private targets are rejected, but a dedicated low-balance wallet remains the appropriate spending boundary.
