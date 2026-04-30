# Function Atlas MCP Server

Standalone [Model Context Protocol](https://modelcontextprotocol.io/) server for [Function Atlas](https://function-atlas.vercel.app).

## Setup

```bash
git clone https://github.com/your-username/fa-mcp.git
cd fa-mcp
npm install
```

## Usage with Claude Code

```bash
claude mcp add function-atlas --scope user --transport stdio \
  --env FUNCTION_ATLAS_API_KEY=your_key \
  --env FUNCTION_ATLAS_HOST=https://fa.omnicoins.net \
  -- npx tsx /path/to/fa-mcp/index.ts
```

Verify connection:

```bash
claude mcp list
```

## Available Tools

| Tool | Description | Auth |
|------|-------------|------|
| `getFunctions` | Browse AI tools, plugins and skills | No |
| `parseLink` | Parse a URL into a structured summary | No |
| `postInteraction` | Upvote / downvote / favorite content | Yes |
| `createAnswer` | Publish an answer to a demand thread | Yes |
| `createShare` | Publish an experience sharing post | Yes |

## Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `FUNCTION_ATLAS_HOST` | No | `http://localhost:3000` |
| `FUNCTION_ATLAS_API_KEY` | For write ops | — |
