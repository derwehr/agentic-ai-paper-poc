# A2A Conference Agent Server

This directory contains an A2A (Agent-to-Agent) server that exposes a conference booking agent as a "skill." This allows other agentic systems to delegate the entire task of planning and booking a conference trip to this specialized agent.

## Overview

The server is built using the `A2AStarletteApplication` and `uvicorn`. On startup, it launches its own set of MCP servers (`conference_discovery`, `booking`, etc.) which are then used by an internal `ConferenceAgentExecutor` to fulfill booking requests.

The agent's capabilities are advertised via an `AgentCard`, making it discoverable to other A2A-compatible systems.

## Setup and Configuration

### 1. Install Dependencies

First, it is recommended to create and activate a virtual environment. Then, install the required Python packages:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
pip install -r requirements.txt
```

### 2. Configure API Keys

The internal agent executor requires an API key for its language model. Create a `.env` file in the `conference_agent/` subdirectory and add your key.

**conference_agent/.env file:**
```
# For OpenAI, Anthropic, DeepSeek, etc.
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
DEEPSEEK_API_KEY="sk-..."
```

### 3. Ensure MCP Servers are Built

This server runs the MCP servers as subprocesses. Before running it, make sure you have installed and built all the necessary Node.js-based MCP servers in the `mcp-server-conference-use-case` directory, as described in its README.

## How to Run the Server

The main entry point is the `__main__.py` file inside the `conference_agent` directory.

To run the server, navigate to the `conference_agent` directory and execute the script:

```bash
cd conference_agent
python __main__.py
```

The A2A server will start, typically on `http://localhost:9998`. It will first initialize the required MCP servers and then begin listening for incoming requests from other agents.

## Testing the Server

Once the server is running, you can use the provided `test_client.py` to send a sample request and verify that everything is working.

1.  **Keep the server running** in its terminal.
2.  **Open a second terminal** and navigate to the `conference_agent` directory.
3.  **Run the client:**
    ```bash
    python test_client.py
    ```

The client will connect to the server, fetch its public `AgentCard`, send a pre-defined conference booking query, and print the agent's final response to the console.
