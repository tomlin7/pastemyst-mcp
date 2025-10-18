# PasteMyst MCP Server

> - "[**Prepare good documentation for this project and make a paste with it**](https://paste.myst.rs/fko4z335)"
> - "[**Create a paste with all changes in this PR**](https://paste.myst.rs/grvf62qb)"
> - "[**Make a paste of all the popular sorting algorithms and their time complexity**](https://paste.myst.rs/6rhkftvt)"

An MCP server for the [PasteMyst](https://paste.myst.rs) API. Allows llms to create, read, update, and delete code pastes, manage user information, etc. Some of the [awesome use cases](#awesome-use-cases) are listed below.

When you are done working on a new PR and you need a description or when you need to QUICKLY share some code with someone while you are in cursor/claude, you can simply say: 

>  **"I'm done with this feature, create a paste for manager"**. 

Check out this sample paste I just created for this repo: https://paste.myst.rs/fko4z335

<img width=1000 alt="example usage" src="https://github.com/user-attachments/assets/5146515e-25ae-4f2c-a8bd-f994ee23c0a6" />


## How to use it?

First, install deps and build the project:

```bash
bun install
bun run build
```

Add to your claude/cursor/vscode mcp server config file:

> [!NOTE]
> You can provide the API key optionally if you want to create private pastes or edit/delete pastes.

```json
{
  "mcpServers": {
    "pastemyst": {
      "command": "node",
      "args": ["path/to/pastemyst-mcp/build/index.js"],
      "env": {
        "PASTEMYST_API_TOKEN": "your_api_token_here"
      }
    }
  }
}
```

Might want to restart claude/cursor/vscode to load the new config.

### About API token:

Provide the API token in the `env` section if you want to create private pastes or edit/delete pastes.

1. Log in to [PasteMyst](https://paste.myst.rs)
2. Go to Profile > settings 
3. Copy your API token and add it as `PASTEMYST_API_TOKEN` in the `env` of config

## Awesome use cases

- "Prepare good documentation for this project and make a paste with it"
  - "I think you missed the X feature and Y feature, edit the paste"
- "Check the user codemyst on pastemyst, gimme all their data"
- "Create a paste with a Python hello world program"
  - "Edit this paste to print fibonacci sequence"
  - "Delete this paste"
  - "can we do it in rust instead, edit it"
- "Get the paste with id abc123"
  - "Who created this paste?"
  - "When was this paste created?"
  - "How many stars does this paste have?"
  - "What tags are associated with this paste?"
  - "What is the content of this paste?"
- "gimme my pastemyst details and fetch my pastes"
  - "fetch all my pastes"
  - "fetch all my private pastes"
  - "fetch all my public pastes"
  - "fetch all my starred pastes"
- "What language uses the .ts extension?" 
  - "How many languages are supported by PasteMyst?"
- "Sell all ma pastemyst stocks" yeah right

## Rate Limiting

The PasteMyst API is rate-limited to 5 requests per second. Exceeding this limit will result in 429 (Too Many Requests) responses.

## Links

- [API Documentation](https://paste.myst.rs/api-docs/index)
- [PasteMyst](https://paste.myst.rs)
- [Model Context Protocol](https://modelcontextprotocol.io)
