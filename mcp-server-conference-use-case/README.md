# Conference Booking Use Case - MCP Server Setup

This document provides instructions for setting up and running the necessary MCP (Model Context Protocol) servers for the conference booking use case.

## Overview

This use case demonstrates how a series of MCP servers can work together to plan and book a trip to a conference. It uses a central registry server for discovering and orchestrating a collection of specialized servers that handle tasks like finding conference details, searching for flights, and booking hotels.

This setup includes a complete set of mock servers, allowing you to run the entire workflow without needing external API keys.

## Architecture

The architecture consists of a central registry server and several specialized service servers.

*   **MCP Registry Server (`mpc-registry-conferences`):** This is the central hub for service discovery. It doesn't perform booking tasks itself but maintains a list of available service servers. An AI assistant can query the registry to find the right tool for a specific task.

*   **Service Servers:** These servers perform specific tasks. The use case includes a set of mock servers for a self-contained demonstration:
    *   **Conference Discovery (`mcp-conference-discovery-mock`):** Finds conference dates, locations, and other details.
    *   **Booking (`mcp-booking-mock`):** Searches for and "books" flights and hotels using mock data.
    *   **Mediation Helpers (`mcp-conference-mediation-helpers-mock`):** Provides utility functions like getting the current date or geocoding addresses.

## Setup and Installation

You'll need to install the registry server and all the mock service servers.

*   **1. Registry Server:** `mpc-registry-conferences`
*   **2. Mock Conference Discovery:** `mcp-conference-discovery-mock`
*   **3. Mock Mediation Helpers:** `mcp-conference-mediation-helpers-mock`
*   **4. Mock Booking:** `mcp-booking-mock`

For each of the servers listed above, follow these installation steps:

```bash
cd <server-directory>
npm install
npm run build
```

## Configuration

### 1. Registry Configuration

The registry server is configured by editing the `mpc-registry-conferences/src/servers.json` file. This file tells the registry which service servers are available. The paths should be relative to the root of the workspace.

Here is an example configuration for the mock servers:

```json
{
  "mcp-conference-discovery-mock": {
    "description": "Server to find conferences and their details.",
    "address": {
      "command": "node",
      "args": [
        "agentic-ai-implementations/mcp-server-conference-use-case/mcp-conference-discovery-mock/build/index.js"
      ]
    }
  },
  "mcp-conference-mediation-helpers-mock": {
    "description": "Has tools for mediating during the booking process of a conference.",
    "address": {
      "command": "node",
      "args": [
        "agentic-ai-implementations/mcp-server-conference-use-case/mcp-conference-mediation-helpers-mock/build/index.js"
      ]
    }
  },
  "mcp-booking-mock": {
    "description": "A service for booking flights and hotels for a conference.",
    "address": {
      "command": "node",
      "args": [
        "agentic-ai-implementations/mcp-server-conference-use-case/mcp-booking-mock/build/index.js"
      ]
    }
  }
}
```

### 2. MCP Client Configuration (`mcp.json`)

Your AI assistant's `mcp.json` file only needs to be configured to connect to the registry server. The registry will provide the information needed to connect to the other servers.

Add the following entry to the `mcpServers` object in your `mcp.json` file:

```json
{
  "mcpServers": {
    "mcp-registry-conferences": {
      "command": "node",
      "args": ["<path-to-repository>/agentic-ai-implementations/mcp-server-conference-use-case/mpc-registry-conferences/build/index.js"]
    }
  }
}
```

**Important:**
- Replace `<path-to-repository>` with the absolute path to the directory on your machine.

---

## Using Live Servers (Optional)

This repository also includes live implementations of the booking and mediation helpers servers that connect to real-world APIs. If you want to use them instead of the mock servers, you will need to provide your own API keys.

### 1. Amadeus Booking Server (`mcp-amadeus-booking`)

This server provides tools for searching for flights and hotels using the Amadeus Self-Service APIs.

*   **Installation:**
    ```bash
    cd mcp-amadeus-booking
    npm install
    npm run build
    ```
*   **Configuration:**
    Create a `.env` file in the `mcp-amadeus-booking/` directory with your Amadeus API credentials:
    ```
    AMADEUS_CLIENT_ID="YOUR_AMADEUS_CLIENT_ID"
    AMADEUS_CLIENT_SECRET="YOUR_AMADEUS_CLIENT_SECRET"
    ```

### 2. Conference Mediation Helpers (`mcp-conference-mediation-helpers`)

This server provides a geocoding tool that uses the Google Geocoding API.

*   **Installation:**
    ```bash
    cd mcp-conference-mediation-helpers
    npm install
    npm run build
    ```
*   **Configuration:**
    Create a `.env` file in the `mcp-conference-mediation-helpers/` directory with your Google Cloud API key:
    ```
    GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
    ```

### 3. Updating the Registry

After setting up the live servers, you need to update the `mpc-registry-conferences/src/servers.json` file to point to them instead of the mock servers.

For example, to use the live booking server, you would change this:

```json
  "mcp-booking-mock": {
    "description": "A service for booking flights and hotels for a conference.",
    "address": {
      "command": "node",
      "args": [
        "agentic-ai-implementations/mcp-server-conference-use-case/mcp-booking-mock/build/index.js"
      ]
    }
  },
```

...to this:

```json
  "mcp-amadeus-booking": {
    "description": "A service for booking flights and hotels for a conference.",
    "address": {
      "command": "node",
      "args": [
        "agentic-ai-implementations/mcp-server-conference-use-case/mcp-amadeus-booking/build/index.js"
      ]
    }
  },
```

## Usage

With the servers configured, you can start planning a conference trip. The AI assistant will first query the registry to discover the available services and then use them to plan the trip.

For a detailed walkthrough of a conversation, see `example.md`.

**Example Prompt:**

- "i want to go to a conference" 