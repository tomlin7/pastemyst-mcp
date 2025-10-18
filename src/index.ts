#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as pastemyst from "pastemyst-ts";

const PASTEMYST_API_TOKEN = process.env.PASTEMYST_API_TOKEN;

if (PASTEMYST_API_TOKEN) {
  pastemyst.authorize(PASTEMYST_API_TOKEN);
  console.error("PasteMyst MCP Server: Authorized with API token");
} else {
  console.error("PasteMyst MCP Server: Running without authorization (read-only mode)");
}

const server = new McpServer({
  name: "pastemyst-mcp",
  version: "1.0.0",
  capabilities: {
    tools: {},
  },
});

// ===== DATA ENDPOINTS =====

server.tool(
  "get_language_by_name",
  "Get language information by name from PasteMyst",
  {
    name: z.string().describe("Name of the programming language (e.g., 'Python', 'JavaScript')"),
  },
  async ({ name }) => {
    const lang = await pastemyst.data.getLanguageByName(name);

    if (!lang) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get language info: Language "${name}" not found`,
          },
        ],
      };
    }

    const details = [
      `**${lang.name}**`,
      `Mode: ${lang.mode}`,
      `MIME types: ${lang.mimes.join(", ")}`,
    ];

    if (lang.ext && lang.ext.length > 0) {
      details.push(`Extensions: ${lang.ext.join(", ")}`);
    }

    if (lang.color) {
      details.push(`Color: ${lang.color}`);
    }

    return {
      content: [
        {
          type: "text",
          text: details.join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "get_language_by_extension",
  "Get language information by file extension from PasteMyst",
  {
    extension: z.string().describe("File extension (e.g., 'py', 'js', 'ts')"),
  },
  async ({ extension }) => {
    const lang = await pastemyst.data.getLanguageByExtension(extension);

    if (!lang) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get language info: No language found for extension "${extension}"`,
          },
        ],
      };
    }

    const details = [
      `**${lang.name}**`,
      `Mode: ${lang.mode}`,
      `MIME types: ${lang.mimes.join(", ")}`,
    ];

    if (lang.ext && lang.ext.length > 0) {
      details.push(`Extensions: ${lang.ext.join(", ")}`);
    }

    if (lang.color) {
      details.push(`Color: ${lang.color}`);
    }

    return {
      content: [
        {
          type: "text",
          text: details.join("\n"),
        },
      ],
    };
  }
);

// ===== TIME ENDPOINTS =====

server.tool(
  "convert_expires_in_to_unix_time",
  "Convert a PasteMyst expiresIn value to a Unix timestamp",
  {
    createdAt: z.number().describe("Unix timestamp of when the paste was created"),
    expiresIn: z
      .enum(["never", "1h", "2h", "10h", "1d", "2d", "1w", "1m", "1y"])
      .describe("When the paste expires (never, 1h, 2h, 10h, 1d, 2d, 1w, 1m, 1y)"),
  },
  async ({ createdAt, expiresIn }) => {
    const result = await pastemyst.time.expiresInToUnixTimestamp(
      createdAt,
      expiresIn as pastemyst.ExpiresIn
    );

    if (!result || result === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to convert time: Invalid result`,
          },
        ],
      };
    }

    const expiryDate = new Date(result * 1000);
    return {
      content: [
        {
          type: "text",
          text: `Expiry Unix timestamp: ${result}\nExpiry date: ${expiryDate.toUTCString()}`,
        },
      ],
    };
  }
);

// ===== PASTE ENDPOINTS =====

server.tool(
  "get_paste",
  "Get a paste by its ID from PasteMyst. Requires PASTEMYST_API_TOKEN env var for private pastes.",
  {
    id: z.string().describe("The ID of the paste to retrieve"),
  },
  async ({ id }) => {
    const paste = await pastemyst.pastes.getPaste(id);

    if (!paste) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get paste: Paste not found or access denied`,
          },
        ],
      };
    }

    const details = [
      `**${paste.title || "Untitled Paste"}**`,
      `ID: ${paste._id}`,
      `Created: ${new Date(paste.createdAt * 1000).toUTCString()}`,
      `Stars: ${paste.stars}`,
      paste.isPrivate ? "🔒 Private" : "🌐 Public",
      paste.tags.length > 0 ? `Tags: ${paste.tags.join(", ")}` : "",
      `\n**Pasties (${paste.pasties.length}):**`,
    ];

    paste.pasties.forEach((pasty, index) => {
      details.push(`\n--- Pasty ${index + 1}: ${pasty.title || "Untitled"} ---`);
      details.push(`Language: ${pasty.language}`);
      details.push(`\`\`\`${pasty.language}\n${pasty.code}\n\`\`\``);
    });

    return {
      content: [
        {
          type: "text",
          text: details.filter(Boolean).join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "create_paste",
  "Create a new paste on PasteMyst. Requires PASTEMYST_API_TOKEN env var for private/public/tagged pastes.",
  {
    title: z.string().optional().describe("Title of the paste"),
    expiresIn: z
      .enum(["never", "1h", "2h", "10h", "1d", "2d", "1w", "1m", "1y"])
      .optional()
      .describe("When the paste expires"),
    isPrivate: z.boolean().optional().describe("Whether the paste is private (requires PASTEMYST_API_TOKEN)"),
    isPublic: z.boolean().optional().describe("Whether to display on public profile (requires PASTEMYST_API_TOKEN)"),
    tags: z.array(z.string()).optional().describe("Array of tags (requires PASTEMYST_API_TOKEN)"),
    pasties: z
      .array(
        z.object({
          title: z.string().optional(),
          language: z.string(),
          code: z.string(),
        })
      )
      .describe("Array of pasty objects with title, language, and code"),
  },
  async ({ title, expiresIn, isPrivate, isPublic, tags, pasties }) => {
    const data: any = { pasties };
    if (title) data.title = title;
    if (expiresIn) data.expiresIn = expiresIn;
    if (isPrivate !== undefined) data.isPrivate = isPrivate;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (tags) data.tags = tags;

    const paste = await pastemyst.pastes.createPaste(data);

    if (!paste) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create paste: Request failed`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Paste created successfully!\n\nID: ${paste._id}\nURL: https://paste.myst.rs/${paste._id}\nTitle: ${paste.title || "Untitled"}\nPasties: ${paste.pasties.length}`,
        },
      ],
    };
  }
);

server.tool(
  "edit_paste",
  "Edit an existing paste on PasteMyst. Requires PASTEMYST_API_TOKEN env var.",
  {
    id: z.string().describe("The ID of the paste to edit"),
    title: z.string().optional().describe("New title for the paste"),
    isPrivate: z.boolean().optional().describe("Update private status"),
    isPublic: z.boolean().optional().describe("Update public profile visibility"),
    tags: z.array(z.string()).optional().describe("Array of tags"),
    pasties: z
      .array(
        z.object({
          _id: z.string(),
          title: z.string().optional(),
          language: z.string(),
          code: z.string(),
        })
      )
      .optional()
      .describe("Complete array of pasty objects with IDs (must include all pasties)"),
  },
  async ({ id, title, isPrivate, isPublic, tags, pasties }) => {
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (isPrivate !== undefined) data.isPrivate = isPrivate;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (tags !== undefined) data.tags = tags;
    if (pasties !== undefined) data.pasties = pasties;

    const paste = await pastemyst.pastes.editPaste(id, data);

    if (!paste) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to edit paste: Request failed or access denied`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Paste updated successfully!\n\nID: ${id}\nURL: https://paste.myst.rs/${id}`,
        },
      ],
    };
  }
);

server.tool(
  "delete_paste",
  "Delete a paste from PasteMyst. Requires PASTEMYST_API_TOKEN env var. Irreversible!",
  {
    id: z.string().describe("The ID of the paste to delete"),
  },
  async ({ id }) => {
    const success = await pastemyst.pastes.deletePaste(id);

    if (!success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete paste: Request failed or access denied`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Paste ${id} has been permanently deleted.`,
        },
      ],
    };
  }
);

// ===== USER ENDPOINTS =====

server.tool(
  "check_user_exists",
  "Check if a user exists on PasteMyst",
  {
    username: z.string().describe("Username to check"),
  },
  async ({ username }) => {
    const exists = await pastemyst.users.userExists(username);

    return {
      content: [
        {
          type: "text",
          text: exists
            ? `✅ User "${username}" exists on PasteMyst.`
            : `❌ User "${username}" does not exist on PasteMyst.`,
        },
      ],
    };
  }
);

server.tool(
  "get_user",
  "Get a user's public profile from PasteMyst",
  {
    username: z.string().describe("Username of the user to retrieve"),
  },
  async ({ username }) => {
    const user = await pastemyst.users.getUser(username);

    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get user: User not found or profile is private`,
          },
        ],
      };
    }

    const badges: string[] = [];
    if (user.supporterLength > 0) badges.push("💎 Supporter");
    if (user.contributor) badges.push("⭐ Contributor");

    const details = [
      `**${user.username}**`,
      `ID: ${user._id}`,
      `Default Language: ${user.defaultLang}`,
      `Public Profile: ${user.publicProfile ? "Yes" : "No"}`,
    ];

    if (badges.length > 0) {
      details.push(`Badges: ${badges.join(", ")}`);
    }

    if (user.supporterLength > 0) {
      details.push(`Supporter for: ${user.supporterLength} months`);
    }

    return {
      content: [
        {
          type: "text",
          text: details.join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "get_current_user",
  "Get the current authenticated user's information. Requires PASTEMYST_API_TOKEN env var.",
  {},
  async () => {
    const user = await pastemyst.users.getCurrentUser();

    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get current user: Invalid or expired token`,
          },
        ],
      };
    }

    const badges: string[] = [];
    if (user.supporterLength > 0) badges.push("💎 Supporter");
    if (user.contributor) badges.push("⭐ Contributor");

    const details = [
      `**${user.username}** (You)`,
      `ID: ${user._id}`,
      `Default Language: ${user.defaultLang}`,
      `Public Profile: ${user.publicProfile ? "Yes" : "No"}`,
      `Starred Pastes: ${user.stars.length}`,
    ];

    if (badges.length > 0) {
      details.push(`Badges: ${badges.join(", ")}`);
    }

    if (user.supporterLength > 0) {
      details.push(`Supporter for: ${user.supporterLength} months`);
    }

    return {
      content: [
        {
          type: "text",
          text: details.join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "get_user_pastes",
  "Get the current authenticated user's pastes. Requires PASTEMYST_API_TOKEN env var.",
  {},
  async () => {
    const pasteIds = await pastemyst.users.getOwnPasteIDs();

    if (pasteIds.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "You don't have any pastes yet.",
          },
        ],
      };
    }

    const pasteList = pasteIds
      .map((id, index) => `${index + 1}. https://paste.myst.rs/${id}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `**Your Pastes (${pasteIds.length}):**\n\n${pasteList}`,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PasteMyst MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

