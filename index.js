#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { randomUUID } from 'node:crypto';
const apiBaseUrl = process.env.EXTRACT_API_URL || 'https://extract.dkta.dev';


const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey) {
  console.error('Error: AGENT_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
const paymentClient = new x402Client();
registerExactEvmScheme(paymentClient, { signer: account });
const fetchWithPayment = wrapFetchWithPayment(fetch, paymentClient);

const server = new Server(
  { name: 'extract-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'extract_webpage',
      description: 'Extract clean readable text from a public HTTP(S) URL. Costs $0.001 USDC per call via x402 on Base mainnet.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The public HTTP(S) URL to extract content from',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'extract_webpage_batch',
      description: 'Extract clean readable text from 1 to 5 public HTTP(S) URLs for a flat $0.005 USDC via x402 on Base mainnet.',
      inputSchema: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
            description: 'Array of public HTTP(S) URLs to extract content from (max 5)',
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

    const extractUrl = `${apiBaseUrl}/v1/extract?url=${encodeURIComponent(url)}`;
    const response = await fetchWithPayment(extractUrl, {
      headers: { 'X-Request-ID': randomUUID() },
    });

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

    const response = await fetchWithPayment(`${apiBaseUrl}/v1/extract/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': randomUUID() },
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
