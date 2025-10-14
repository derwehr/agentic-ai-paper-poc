import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const server = new McpServer({
    name: "mcp-conference-mediation-helpers-mock",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.registerTool("get_coordinates", {
    description: "Gets the latitude and longitude for a given address using Google Geocoding API.",
    inputSchema: {
        address: z.string().describe("The address to geocode."),
    },
}, async ({ address }) => {
    const lowerCaseAddress = address.toLowerCase();
    if (lowerCaseAddress.includes("vienna")) {
        const mockLocation = {
            lat: 48.2082,
            lng: 16.3738,
        };
        return {
            content: [{ type: "text", text: JSON.stringify(mockLocation, null, 2) }],
        };
    }
    else if (lowerCaseAddress.includes("japan")) {
        const mockLocation = {
            lat: 34.6833362,
            lng: 135.8052412,
        };
        return {
            content: [{ type: "text", text: JSON.stringify(mockLocation, null, 2) }],
        };
    }
    else {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: "Address not found in mock data" }) }],
        };
    }
});
server.registerTool("get_current_date", {
    description: "Gets the current date in YYYY-MM-DD format. Use it when the user asks questions that are date-sensitive.",
    inputSchema: {},
}, async () => {
    const formattedDate = "2025-10-10";
    return {
        content: [
            {
                type: "text",
                text: formattedDate,
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("conference_mediation_helpers MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
