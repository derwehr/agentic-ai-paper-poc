import logging
import asyncio
from typing import Any
from uuid import uuid4

import httpx

from a2a.client import A2ACardResolver, A2AClient
from a2a.types import MessageSendParams, SendMessageRequest
from a2a.utils.constants import AGENT_CARD_WELL_KNOWN_PATH


async def main() -> None:
    """
    A simple test client to interact with the Conference A2A Agent.
    """
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    base_url = 'http://localhost:9998'

    # The agent can take a while to process, so we set a long timeout.
    async with httpx.AsyncClient(timeout=300.0) as httpx_client:
        resolver = A2ACardResolver(
            httpx_client=httpx_client,
            base_url=base_url,
        )

        try:
            logger.info(
                f'Attempting to fetch agent card from: {base_url}{AGENT_CARD_WELL_KNOWN_PATH}'
            )
            agent_card = await resolver.get_agent_card()
            logger.info('Successfully fetched public agent card:')
            logger.info(
                agent_card.model_dump_json(indent=2, exclude_none=True)
            )

        except Exception as e:
            logger.error(
                f'Critical error fetching agent card: {e}', exc_info=True
            )
            raise RuntimeError(
                'Failed to fetch the public agent card. Cannot continue.'
            ) from e

        client = A2AClient(
            httpx_client=httpx_client, agent_card=agent_card
        )
        logger.info('A2AClient initialized.')

        # The query from the original secondconference.py
        query = (
            "i want to go to the INTERNATIONAL SEMANTIC WEB CONFERENCE from vienna. "
            "Book the flight and hotel for me, you dont need to get my permission for booking"
        )

        send_message_payload: dict[str, Any] = {
            'message': {
                'role': 'user',
                'parts': [{'kind': 'text', 'text': query}],
                'messageId': uuid4().hex,
            },
        }

        request = SendMessageRequest(
            id=str(uuid4()), params=MessageSendParams(**send_message_payload)
        )

        logger.info(f"Sending query: '{query}'")
        response = await client.send_message(request)

        print("\n--- Agent Response ---")
        print(response.model_dump_json(indent=2, exclude_none=True))
        print("--- End of Response ---")


if __name__ == '__main__':
    asyncio.run(main())
