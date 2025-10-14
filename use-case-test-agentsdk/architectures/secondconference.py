import asyncio
import os
import logging
from dotenv import load_dotenv
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
from logging_config import setup_logging
from models import get_model_config, setup_model_client


# Load environment variables from a .env file
load_dotenv()


async def main(model_name: str, query: str) -> None:
    """
    This script creates and runs a simple agent that connects to local
    conference and booking MCP servers using stdio.
    """
    # Setup logging
    setup_logging()

    # Get the configuration for the specified model and set up the client.
    model_config = get_model_config(model_name)
    setup_model_client(model_config)

    # Determine the base directory of the 'agentic-ai-implementations' folder
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    # Construct server script paths relative to the base directory
    conference_discovery_server_script = os.path.join(
        base_dir, "mcp-server-conference-use-case", "mcp-conference-discovery-mock", "build", "index.js"
    )
    conference_mediation_helpers_server_script = os.path.join(
        base_dir, "mcp-server-conference-use-case", "mcp-conference-mediation-helpers-mock", "build", "index.js"
    )
    booking_mock_server_script = os.path.join(
        base_dir, "mcp-server-conference-use-case", "mcp-booking-mock", "build", "index.js"
    )

    # The SDK spawns the process, keeps the pipes open, and closes them
    # automatically when the context manager exits.
    async with MCPServerStdio(
        name="ConferencesServer",
        params={
            "command": "node",
            "args": [conference_discovery_server_script],
        },
    ) as conferences_server, MCPServerStdio(
        name="ConferenceServer",
        params={
            "command": "node",
            "args": [conference_mediation_helpers_server_script],
        },
    ) as conference_server, MCPServerStdio(
        name="BookingServer",
        params={
            "command": "node",
            "args": [booking_mock_server_script],
        },
    ) as booking_server:
        # Define the agent that will use the MCP server
        agent = Agent(
            name="Agent",
            instructions="You are a helpful travel agent that can book flights and hotels for a conference.",
            mcp_servers=[conferences_server, conference_server, booking_server],
            model=model_config.model_string,
        )

        # Run the agent with a sample query
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


if __name__ == "__main__":
    # This script is intended to be run from run_test.py, which provides the query.
    # For standalone testing, you can uncomment the following lines:
    # default_query = "i want to go to the INTERNATIONAL SEMANTIC WEB CONFERENCE from vienna. Book the flight and hotel for me, you dont need to get my permission for booking"
    # asyncio.run(main("gpt-4o", default_query))
    pass
