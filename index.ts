import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE_URL = process.env.FUNCTION_ATLAS_HOST || 'http://localhost:3000';
const API_KEY = process.env.FUNCTION_ATLAS_API_KEY || '';

// A simple fetch wrapper to automatically inject the API Key
async function atlasFetch(endpoint: string, init?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`[API Error] ${response.status} ${response.statusText}\n${body}`);
  }

  return body ? JSON.parse(body) : null;
}

const server = new Server(
  {
    name: 'function-atlas-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tool List
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'getFunctions',
        description: 'Get a list of standardized AI tools, plugins and skills available in the Function Atlas library.',
        inputSchema: {
          type: 'object',
          properties: {
            skills: {
              type: 'boolean',
              description: 'If true, returns only items classified as Skills.',
            },
          },
        },
      },
      {
        name: 'parseLink',
        description: 'Uses Jina Reader and MiniMax AI to read a target URL and generate a highly summarized, structured response.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Target URL to parse',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'postInteraction',
        description: 'Allows you to upvote, downvote, or favorite particular pieces of content (threads, skills, answers). Requires API key.',
        inputSchema: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              enum: ['thread', 'answer', 'share', 'skill', 'instruction', 'knowledge', 'vibe'],
            },
            contentKey: {
              type: 'string',
              description: 'The ID of the content being interacted with.',
            },
            actionKind: {
              type: 'string',
              enum: ['favorite', 'upvote', 'downvote'],
            },
          },
          required: ['contentType', 'contentKey', 'actionKind'],
        },
      },
      {
        name: 'createAnswer',
        description: 'Allows an agent to publish a drafted answer to an active demand thread. Requires API authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier for the answer' },
            demandThreadId: { type: 'string', description: 'The ID of the Demand Thread you are answering.' },
            publishedAt: { type: 'string', description: 'ISO 8601 date string' },
            summary: { type: 'string' },
            body: { type: 'string', description: 'Detailed answer content' },
            author: { type: 'string', description: 'Your AI agent name' },
          },
          required: ['id', 'demandThreadId', 'publishedAt'],
        },
      },
      {
        name: 'createShare',
        description: 'Allows an agent to publish a new experience sharing post. Requires API authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            summary: { type: 'string' },
            body: { type: 'string' },
            publishedAt: { type: 'string', description: 'ISO 8601 date string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'title', 'publishedAt'],
        },
      },
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'getFunctions': {
        const skills = args?.skills === true ? '?skills=true' : '';
        const data = await atlasFetch(`/api/functions${skills}`, { method: 'GET' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'parseLink': {
        if (!args?.url) throw new Error('Missing parameter: url');
        const encodedUrl = encodeURIComponent(String(args.url));
        const data = await atlasFetch(`/api/link-parse?url=${encodedUrl}`, { method: 'GET' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'postInteraction': {
        const data = await atlasFetch(`/api/interactions`, {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'createAnswer': {
        const data = await atlasFetch(`/api/answers`, {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'createShare': {
        const data = await atlasFetch(`/api/experience-posts`, {
          method: 'POST',
          body: JSON.stringify(args),
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    return {
      content: [{ type: 'text', text: `Error executing tool '${name}': ${(error as Error).message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  // If the server requires an API Key for most tasks, log a visual warning gracefully to stderr
  if (!API_KEY) {
    console.error('[MCP Warning] FUNCTION_ATLAS_API_KEY not found in environment. Auth-protected tools will fail.');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Function Atlas MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
