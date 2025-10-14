import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configure dotenv to load the .env file from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY must be set as an environment variable");
}

const server = new McpServer({
  name: "conference_mediation_helpers",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.registerTool(
  "get_coordinates",
  {
    description: "Gets the latitude and longitude for a given address using Google Geocoding API.",
    inputSchema: {
      address: z.string().describe("The address to geocode."),
    },
  },
  async ({ address }) => {
    try {
      const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address,
          key: process.env.GOOGLE_API_KEY,
        },
      });

      if (response.data.status === "OK") {
        const location = response.data.results[0].geometry.location;
        return {
          content: [{ type: "text", text: JSON.stringify(location, null, 2) }],
        };
      } else {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: response.data.error_message || `Geocoding failed with status: ${response.data.status}` }) }],
        };
      }
    } catch (error: any) {
      const errorMsg = `Google Geocoding API error: ${error.message}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
      };
    }
  }
);

server.registerTool(
  "get_current_date",
  {
    description: "Gets the current date in YYYY-MM-DD format. Use it when the user asks questions that are date-sensitive.",
    inputSchema: {},
  },
  async () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    return {
      content: [
        {
          type: "text",
          text: formattedDate,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("conference_mediation_helpers MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
