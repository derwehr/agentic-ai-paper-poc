import asyncio
import json
import logging
import sys
import os
from dotenv import load_dotenv

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agents import Agent, Runner
from agents.mcp import MCPServerStdio
from logging_config import setup_logging
from models import get_model_config, setup_model_client


# Load environment variables from a .env file
load_dotenv()


async def discover_servers(
    model_config, query: str, registry_server_script: str
) -> list:
    """
    Uses a discovery agent to find the servers required for a given query.
    Returns a list of server configurations.
    """
    logging.info("Starting server discovery...")
    # 1. Start the registry server
    async with MCPServerStdio(
        name="RegistryServer",
        params={"command": "node", "args": [registry_server_script]},
    ) as registry_server:
        # 2. Create a discovery agent
        discovery_agent = Agent(
            name="DiscoveryAgent",
            instructions=(
                "You are a discovery agent. Your job is to find ALL MCP servers "
                "needed to fulfill a user's request. First, analyze the user's query "
                "to determine what capabilities are needed (e.g., conference search, "
                "flight booking, hotel booking, helper tools like geocoding). For each "
                "capability, use the RegistryServer to search for a relevant server. "
                "After finding all servers, get their addresses. Your final output "
                "must be only a JSON list of server configurations. Each configuration "
                "must contain 'name' and 'params' (with 'command' and 'args')."
            ),
            mcp_servers=[registry_server],
            model=model_config.model_string,
        )

        # 3. Run the discovery agent
        discovery_query = (
            "The user wants to plan a conference trip. The query is: "
            f"'{query}'. Find all servers needed for this, including conference "
            "discovery, booking (flights and hotels), and any mediation helpers. "
            "Return the final list of server configurations as a JSON object."
        )
        result = await Runner.run(discovery_agent, discovery_query, max_turns=10)

        # 4. Parse the result and return the server list
        try:
            # The output from the agent might have extra text, so we find the JSON
            json_start = result.final_output.find("[")
            json_end = result.final_output.rfind("]") + 1
            json_string = result.final_output[json_start:json_end]
            server_configs = json.loads(json_string)
            logging.info(f"Discovered server configs: {server_configs}")
            return server_configs
        except (json.JSONDecodeError, IndexError) as e:
            logging.error(f"Failed to parse server configs from agent output: {e}")
            logging.error(f"Agent output was: {result.final_output}")
            return []


async def main(model_name: str, query: str) -> None:
    """
    This script discovers and runs the necessary MCP servers for a conference
    booking task, then runs an agent to complete the task.
    """
    # Setup logging
    setup_logging()

    # Get the configuration for the specified model and set up the client.
    model_config = get_model_config(model_name)
    setup_model_client(model_config)

    # Construct the registry server script path relative to the project root
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    registry_server_script = os.path.join(
        project_root, "mcp-server-conference-use-case", "mpc-registry-conferences", "build", "index.js"
    )

    # Step 1: Discover required servers
    server_configs = await discover_servers(model_config, query, registry_server_script)

    if not server_configs:
        logging.error("No servers discovered. Exiting.")
        return

    # Step 2: Dynamically start the discovered servers
    servers = [MCPServerStdio(**config) for config in server_configs]
    server_names = ", ".join(config['name'] for config in server_configs)
    logging.info(f"Starting the following servers: {server_names}")

    try:
        # Manually enter the async context for each server
        await asyncio.gather(*(server.__aenter__() for server in servers))

        # Define the main agent that will use the MCP servers
        agent = Agent(
            name="Agent",
            instructions="You are a helpful travel agent that can book flights and hotels for a conference.",
            mcp_servers=servers,
            model=model_config.model_string,
        )

        # Run the agent with the user query
        result = await Runner.run(agent, query, max_turns=15)
        logging.info("Agent conversation finished.")
        logging.info("Final output:")
        logging.info(result.final_output)

        # Log token usage
        usage = result.context_wrapper.usage
        logging.info(
            "TOKEN_USAGE - "
            f"Requests: {usage.requests}, "
            f"Input Tokens: {usage.input_tokens}, "
            f"Output Tokens: {usage.output_tokens}, "
            f"Total Tokens: {usage.total_tokens}"
        )

    finally:
        # Ensure all server contexts are properly exited
        logging.info("Shutting down servers...")
        await asyncio.gather(*(server.__aexit__(None, None, None) for server in servers))


if __name__ == "__main__":
    # This script is intended to be run from run_test.py, which provides the query.
    # For standalone testing, you can uncomment the following lines:
    # default_query = "i want to go to the INTERNATIONAL SEMANTIC WEB CONFERENCE from vienna. Book the flight and hotel for me, you dont need to get my permission for booking"
    # asyncio.run(main("gpt-4o", default_query))
    pass
