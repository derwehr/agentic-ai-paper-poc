import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import Fuse from "fuse.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const conferencesPath = path.resolve(__dirname, "conference.json");
const conferencesData = JSON.parse(fs.readFileSync(conferencesPath, "utf-8"));
const conferenceList = Object.keys(conferencesData).map((key) => ({
    name: key,
    description: conferencesData[key].description,
    address: conferencesData[key].address,
    date: conferencesData[key].date,
    location: conferencesData[key].location,
}));
const fuse = new Fuse(conferenceList, {
    keys: ["name", "description", "date", "location"],
    includeScore: true,
});
const server = new McpServer({
    name: "mcp-conference-discovery-mock",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.tool("get_conferences", "Get initial list of available conferences that you can later use to get the details of a specific conference", {}, async () => {
    const conferenceList = Object.keys(conferencesData).map((key) => ({
        name: key,
        description: conferencesData[key].description,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(conferenceList),
            },
        ],
    };
});
server.tool("get_conference_details", "Get the details for a specific conference", {
    conference_name: z.string().describe("The name of the conference"),
}, async ({ conference_name }) => {
    const conferenceInfo = conferencesData[conference_name];
    if (conferenceInfo) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(conferenceInfo),
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: "Conference not found",
                },
            ],
        };
    }
});
server.tool("search_conferences", "Search for available conferences by name, description, date, or location. Invoke if the User asks for a Conference/Summit/Event", {
    query: z.string().describe("The search query"),
}, async ({ query }) => {
    const results = fuse.search(query);
    const matchingConferences = results.map((result) => result.item);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(matchingConferences),
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("conference_discovery MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
