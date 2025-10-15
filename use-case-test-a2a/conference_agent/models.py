from dataclasses import dataclass
from typing import Optional
import os
from openai import AsyncOpenAI
from agents import set_default_openai_client, set_tracing_disabled, set_default_openai_api


@dataclass
class ModelConfig:
    """A dataclass to hold the configuration for a specific model."""

    name: str
    provider: str
    model_string: str
    api_key_env: Optional[str] = None
    base_url: Optional[str] = None


# A dictionary mapping a friendly name to its configuration.
# This is the central registry for all supported models.
MODELS = {
    "gpt-4o": ModelConfig(
        name="gpt-4o",
        provider="openai",
        model_string="gpt-4o",
        api_key_env="OPENAI_API_KEY",
    ),
    "claude-3.5-sonnet": ModelConfig(
        name="claude-3.5-sonnet",
        provider="anthropic",
        model_string="litellm/anthropic/claude-3-5-sonnet-20240620",
        api_key_env="ANTHROPIC_API_KEY",
    ),
    "llama3": ModelConfig(
        name="llama3",
        provider="ollama",
        model_string="llama3",
        base_url="http://localhost:11434/v1",
        # Ollama doesn't require an API key by default
    ),
    "deepseek-chat": ModelConfig(
        name="deepseek-chat",
        provider="deepseek",
        model_string="litellm/deepseek/deepseek-chat",
        api_key_env="DEEPSEEK_API_KEY",
    ),
    "deepseek-reasoner": ModelConfig(
        name="deepseek-reasoner",
        provider="deepseek",
        # Mapping 'reasoner' to the 'coder' model, which is best for complex tasks
        model_string="litellm/deepseek/deepseek-coder",
        api_key_env="DEEPSEEK_API_KEY",
    ),
}


def get_model_config(name: str) -> ModelConfig:
    """Retrieves the configuration for a given model name."""
    if name not in MODELS:
        raise ValueError(
            f"Model '{name}' not found. Available models: {list(MODELS.keys())}"
        )
    return MODELS[name]


def setup_model_client(config: ModelConfig):
    """
    Configures the appropriate client and settings for the given model config.
    """
    # 1. Check for the required API key in environment variables.
    if config.api_key_env and not os.getenv(config.api_key_env):
        raise ValueError(
            f"API key environment variable '{config.api_key_env}' not set."
        )

    # 2. Configure the client based on the provider.
    if config.provider == "ollama":
        # For local models via Ollama or other custom endpoints
        custom_client = AsyncOpenAI(base_url=config.base_url, api_key="ollama")
        set_default_openai_client(custom_client)
        set_tracing_disabled(True)
        set_default_openai_api("chat_completions")
        print(f"INFO: Configured to use Ollama model '{config.name}' via {config.base_url}")

    elif config.provider in ["anthropic", "deepseek"]:
        # For models used via LiteLLM
        set_tracing_disabled(True)
        set_default_openai_api("chat_completions")
        print(
            f"INFO: Configured to use {config.provider.capitalize()} model '{config.name}' via LiteLLM"
        )

    elif config.provider == "openai":
        # For OpenAI models, the SDK defaults work well, so we just ensure
        # tracing is enabled and the client is not overridden.
        # set_tracing_disabled(False) # Optional: ensure tracing is on
        print(f"INFO: Configured to use OpenAI model '{config.name}'")

    else:
        # This can be expanded for other providers
        print(f"WARNING: No special client setup for provider '{config.provider}'")
