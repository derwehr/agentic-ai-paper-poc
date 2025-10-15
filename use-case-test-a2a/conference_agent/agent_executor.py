import logging
from agents import Agent, Runner
from agents.mcp import MCPServer
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message
from models import get_model_config, setup_model_client


class ConferenceAgentExecutor(AgentExecutor):
    """
    An AgentExecutor that wraps the conference booking agent functionality.
    """

    def __init__(
        self,
        dependencies: dict,
        model_name: str = "gpt-4o",
    ):
        self.dependencies = dependencies

        # Set up the model client once during initialization.
        self.model_config = get_model_config(model_name)
        setup_model_client(self.model_config)

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """
        Executes the conference booking agent based on the user's request.
        """
        # Extract the user's query from the message parts.
        # The structure is Part -> .root -> .text
        query = "".join(
            part.root.text for part in context.message.parts 
            if hasattr(part.root, 'text') and part.root.text
        )

        if not query:
            await event_queue.enqueue_event(
                new_agent_text_message("I'm sorry, I didn't receive a query.")
            )
            return

        logging.info(f"Received query for conference agent: {query}")

        # Access MCP servers from the dependencies dictionary, populated by the lifespan manager
        conferences_server = self.dependencies.get('conferences_server')
        conference_server = self.dependencies.get('conference_server')
        booking_server = self.dependencies.get('booking_server')

        if not all([conferences_server, conference_server, booking_server]):
            error_message = "I'm sorry, one or more MCP servers are not available. Please check the server logs."
            await event_queue.enqueue_event(new_agent_text_message(error_message))
            logging.error("One or more MCP servers were not found in the dependencies dictionary.")
            return
            
        # Define the agent that will use the MCP servers
        agent = Agent(
            name="ConferenceAgent",
            instructions="You are a helpful travel agent that can book flights and hotels for a conference.",
            mcp_servers=[
                conferences_server,
                conference_server,
                booking_server,
            ],
            model=self.model_config.model_string,
        )

        try:
            # Run the agent with the user's query
            result = await Runner.run(agent, query, max_turns=15)

            final_output = result.final_output or "The agent finished without a final output."
            await event_queue.enqueue_event(new_agent_text_message(final_output))

            # Log token usage
            usage = result.context_wrapper.usage
            logging.info(
                "TOKEN_USAGE - "
                f"Requests: {usage.requests}, "
                f"Input Tokens: {usage.input_tokens}, "
                f"Output Tokens: {usage.output_tokens}, "
                f"Total Tokens: {usage.total_tokens}"
            )

        except Exception as e:
            logging.error(f"An error occurred during agent execution: {e}", exc_info=True)
            error_message = (
                "I'm sorry, an unexpected error occurred while processing your request. "
                "Please check the server logs for more details."
            )
            await event_queue.enqueue_event(new_agent_text_message(error_message))

    async def cancel(
        self, context: RequestContext, event_queue: EventQueue
    ) -> None:
        # For now, cancel is not supported.
        raise NotImplementedError("Cancel is not supported for this agent.")
