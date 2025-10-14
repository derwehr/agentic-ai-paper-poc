# Agentic AI Implementations for Conference Use Case

This repository contains the projects related to an agentic AI conference booking use case, demonstrating different architectures for service orchestration and evaluation.

## Overview

This project is divided into two main components:

1.  **`mcp-server-conference-use-case/`**: This directory contains all the Node.js-based MCP (Model Context Protocol) servers required for the use case. This includes a service registry, mock servers for conference discovery and booking, and live server implementations that connect to real-world APIs. See the `README.md` inside this directory for detailed setup and configuration instructions.

2.  **`use-case-test-agentsdk/`**: This directory contains a Python-based test framework for running and evaluating the conference booking agent. It includes different agent architectures (static vs. dynamic service discovery) and supports various language models. See the `README.md` inside this directory for instructions on how to set up the environment and run the tests.

## Getting Started

1.  **Set up the MCP Servers:** Begin by navigating to the `mcp-server-conference-use-case/` directory and following the setup instructions in its `README.md` to install and build the necessary servers.
2.  **Set up the Test Framework:** Next, navigate to the `use-case-test-agentsdk/` directory and follow the setup instructions in its `README.md` to configure the Python environment and API keys.
3.  **Run the Tests:** From the `use-case-test-agentsdk/` directory, you can run the evaluation scripts as described in the documentation to test the different agent architectures.
