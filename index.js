#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { wrapFetchWithPayment } from 'x402-fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) {
  console.error('Error: AGENT_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);

const server = new Server(
  { name: 'extract-mcp', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'extract_webpage',
      description: 'Extract clean readable text from any URL. Costs $0.001 USDC per call via x402 on Base mainnet.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to extract content from',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'extract_webpage_batch',
      description: 'Extract clean readable text from multiple URLs in one call (up to 5). Each URL costs $0.001 USDC via x402 on Base mainnet.',
      inputSchema: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
            description: 'Array of URLs to extract content from (max 5)',
          },
        },
        required: ['urls'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'extract_webpage') {
    const { url } = request.params.arguments;
    if (!url) {
      throw new Error('url argument is required');
    }

    const extractUrl = `https://extract.dkta.dev/v1/extract?url=${encodeURIComponent(url)}`;
    const response = await fetchWithPayment(extractUrl);

    if (!response.ok) {
      throw new Error(`Extract API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (request.params.name === 'extract_webpage_batch') {
    const { urls } = request.params.arguments;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('urls argument is required and must be a non-empty array');
    }
    if (urls.length > 5) {
      throw new Error('urls array must contain at most 5 URLs');
    }

    const response = await fetchWithPayment('https://extract.dkta.dev/v1/extract/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(`Extract batch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
