import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import Fuse from "fuse.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");
const serversPath = path.resolve(__dirname, "servers.json");
const serversDataRaw = JSON.parse(fs.readFileSync(serversPath, "utf-8"));
const serversData = Object.fromEntries(Object.entries(serversDataRaw).map(([key, serverInfo]) => {
    const newServerInfo = JSON.parse(JSON.stringify(serverInfo));
    if (newServerInfo.address && Array.isArray(newServerInfo.address.args)) {
        newServerInfo.address.args = newServerInfo.address.args.map((arg) => path.resolve(projectRoot, arg).replace(/\\\\/g, "/"));
    }
    return [key, newServerInfo];
}));
const serverList = Object.keys(serversData).map((key) => ({
    name: key,
    description: serversData[key].description,
    address: serversData[key].address,
}));
const fuse = new Fuse(serverList, {
    keys: ["name", "description"],
    includeScore: true,
});
const server = new McpServer({
    name: "mcp-registry-conferences",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.tool("get_servers", "Get initial list of available servers that you can later use to get the address of a specific server", {}, async () => {
    const serverList = Object.keys(serversData).map((key) => ({
        name: key,
        description: serversData[key].description,
    }));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(serverList),
            },
        ],
    };
});
server.tool("get_server_address", "Get the address for a specific server", {
    server_name: z.string().describe("The name of the server"),
}, async ({ server_name }) => {
    const serverInfo = serversData[server_name];
    if (serverInfo) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(serverInfo),
                },
            ],
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
                    text: "Server not found",
                },
            ],
        };
    }
});
server.tool("search_servers", "Search for available servers by name or description invoke if the User asks for a Service/Server", {
    query: z.string().describe("The search query"),
}, async ({ query }) => {
    const results = fuse.search(query);
    const matchingServers = results.map((result) => result.item);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(matchingServers),
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Registry MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
