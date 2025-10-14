# Conference Agent Test Framework

This directory contains a Python-based test framework for evaluating different agentic architectures in the context of a conference booking use case. It is designed to work with the MCP servers located in the `mcp-server-conference-use-case` directory.

## Overview

The framework allows you to run and evaluate a conference booking agent using different underlying architectures and language models.

*   **Architectures:**
    *   **`secondconference` (Static):** A simple architecture where the agent is manually configured with a static list of all required MCP servers.
    *   **`thirdconference` (Dynamic):** A more advanced architecture where the agent is given only a registry server. It must first query the registry to discover the other servers it needs to complete its task.

*   **Models:** The framework uses `litellm` to support various language models, including OpenAI's GPT series, Anthropic's Claude models, and local models via Ollama.

## Setup and Configuration

### 1. Install Dependencies

First, it is recommended to create and activate a virtual environment. Then, install the required Python packages:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`
pip install -r requirements.txt
```

### 2. Configure API Keys

The framework requires API keys for the language models you intend to use. Create a `.env` file in this directory by copying the example below and filling in your keys.

**.env file:**
```
# For OpenAI models
OPENAI_API_KEY="sk-..."

# For Anthropic models
ANTHROPIC_API_KEY="sk-ant-..."

# For DeepSeek models
DEEPSEEK_API_KEY="sk-..."
```
*Note: Local models running via Ollama do not require an API key.*

### 3. Configure Logging Mode (Optional)

By default, the framework appends logs from new test runs to the existing log files in the `logs/` directory. You can change this behavior by setting the `LOG_FILE_MODE` environment variable in your `.env` file.

*   `LOG_FILE_MODE="a"` (Default): Appends to existing log files.
*   `LOG_FILE_MODE="w"`: Overwrites the log files at the start of each run, giving you a clean log for each test.

Example `.env` configuration to overwrite logs:
```
OPENAI_API_KEY="sk-..."
LOG_FILE_MODE="w"
```

### 4. Ensure MCP Servers are Built

This test framework runs the MCP servers as subprocesses. Before running a test, make sure you have installed and built all the necessary Node.js-based MCP servers in the `mcp-server-conference-use-case` directory, as described in its README.

## How to Run Tests

The main entry point for running tests is the `run_test.py` script. It allows you to specify which model and which architecture you want to test.

### Running a Test

Use the following command structure to run a test:

```bash
python run_test.py --model <model_name> --architecture <architecture_name>
```

*   **`--model`**: The name of the model to use. See `models.py` for a full list of supported models. (e.g., `gpt-4o`, `claude-3.5-sonnet`, `llama3`). Defaults to `gpt-4o`.
*   **`--architecture`**: The architecture to run. Use `second` for the static architecture or `third` for the dynamic registry-based architecture. Defaults to `second`.

### Examples

**Run the static architecture with GPT-4o:**
```bash
python run_test.py --architecture second --model gpt-4o
```

**Run the dynamic (registry) architecture with Claude 3.5 Sonnet:**
```bash
python run_test.py --architecture third --model claude-3.5-sonnet
```

**Run with a local Llama3 model via Ollama:**
```bash
python run_test.py --model llama3
```

## Output and Evaluation

When a test is run, the following happens:
1.  The selected agent architecture is executed, and it attempts to complete the conference booking task.
2.  Logs are generated in the `logs/` directory, including a detailed `mcp.log` and a summary `mcp_summary.log`.
3.  After the agent finishes, an `evaluate.py` script runs to analyze the logs and produce a final `evaluation.log`.
