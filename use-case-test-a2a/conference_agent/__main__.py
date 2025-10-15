import asyncio
import uvicorn
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCard,
    AgentSkill,
    AgentCapabilities,
)
from agents.mcp import MCPServerStdio

from agent_executor import ConferenceAgentExecutor
from logging_config import setup_logging


# Determine the base directory of the 'agentic-ai-implementations' folder
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Construct server script paths relative to the base directory
CONFERENCE_DISCOVERY_SCRIPT = os.path.join(
    base_dir, "mcp-server-conference-use-case", "mcp-conference-discovery-mock", "build", "index.js"
)
CONFERENCE_MEDIATION_SCRIPT = os.path.join(
    base_dir, "mcp-server-conference-use-case", "mcp-conference-mediation-helpers-mock", "build", "index.js"
)
BOOKING_MOCK_SCRIPT = os.path.join(
    base_dir, "mcp-server-conference-use-case", "mcp-booking-mock", "build", "index.js"
)

# This dictionary will hold the running MCP server instances for the executor
executor_dependencies = {}


async def startup():
    """
    Startup handler: Initialize and start the MCP servers.
    """
    global executor_dependencies
    # Startup: Initialize and start the MCP servers
    conferences_server = MCPServerStdio(
        name="ConferencesServer",
        params={"command": "node", "args": [CONFERENCE_DISCOVERY_SCRIPT]},
    )
    conference_server = MCPServerStdio(
        name="ConferenceServer",
        params={"command": "node", "args": [CONFERENCE_MEDIATION_SCRIPT]},
    )
    booking_server = MCPServerStdio(
        name="BookingServer",
        params={"command": "node", "args": [BOOKING_MOCK_SCRIPT]},
    )

    # Manually enter the context for each server
    await asyncio.gather(
        conferences_server.__aenter__(),
        conference_server.__aenter__(),
        booking_server.__aenter__()
    )

    executor_dependencies['conferences_server'] = conferences_server
    executor_dependencies['conference_server'] = conference_server
    executor_dependencies['booking_server'] = booking_server
    
    print("MCP servers started.")


async def shutdown():
    """
    Shutdown handler: Stop the MCP servers.
    """
    global executor_dependencies
    print("Shutting down MCP servers...")
    
    conferences_server = executor_dependencies.get('conferences_server')
    conference_server = executor_dependencies.get('conference_server')
    booking_server = executor_dependencies.get('booking_server')
    
    tasks = []
    if conferences_server:
        tasks.append(conferences_server.__aexit__(None, None, None))
    if conference_server:
        tasks.append(conference_server.__aexit__(None, None, None))
    if booking_server:
        tasks.append(booking_server.__aexit__(None, None, None))
        
    await asyncio.gather(*tasks)
    print("MCP servers stopped.")


if __name__ == '__main__':
    # Load environment variables from a .env file
    load_dotenv()
    setup_logging()

    # Define the skills this agent offers
    skill = AgentSkill(
        id='book_conference_trip',
        name='Book a trip to a conference',
        description='Handles finding a conference, booking flights, and booking a hotel.',
        tags=['conference', 'travel', 'booking'],
        examples=[
            'Book me a trip to the International Semantic Web Conference, leaving from Vienna.',
            'I want to go to the Web Conference, find it and book my flight and hotel.'
        ],
    )

    # This will be the public-facing agent card
    agent_card = AgentCard(
        name='Conference Agent',
        description='An agent that can find conferences and book travel.',
        url='http://localhost:9998/',
        version='1.0.0',
        default_input_modes=['text'],
        default_output_modes=['text'],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill],
    )

    # The agent executor is now given the mutable dictionary which the lifespan will populate
    agent_executor = ConferenceAgentExecutor(
        dependencies=executor_dependencies,
        model_name="gpt-4o"  # Or another model from your config
    )

    request_handler = DefaultRequestHandler(
        agent_executor=agent_executor,
        task_store=InMemoryTaskStore(),
    )

    server = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler,
    )

    # Get the underlying Starlette app and attach event handlers
    app = server.build()
    app.add_event_handler("startup", startup)
    app.add_event_handler("shutdown", shutdown)

    uvicorn.run(app, host='0.0.0.0', port=9998, log_config=None)
