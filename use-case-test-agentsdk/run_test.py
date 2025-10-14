import asyncio
import logging
import argparse
import importlib  # Import the importlib module
from evaluate import main as run_evaluation
from models import MODELS


async def main():
    """
    Centralizes the process of running a conference agent and evaluating its output.
    Allows selection of the architecture (e.g., static vs. dynamic servers).
    """
    # Set up command-line argument parsing
    parser = argparse.ArgumentParser(
        description="Run conference agent test with a specified model and architecture."
    )
    parser.add_argument(
        "--model",
        type=str,
        default="gpt-4o",
        choices=list(MODELS.keys()),
        help="The model to use for the test run. Defaults to gpt-4o.",
    )
    parser.add_argument(
        "--architecture",
        type=str,
        default="second",
        choices=["second", "third"],
        help="The architecture to run ('second' for static, 'third' for dynamic). Defaults to 'second'.",
    )
    args = parser.parse_args()

    print(f"--- Starting Test Run with Model: {args.model} and Architecture: {args.architecture} ---")

    # Define the user query to be used for both architectures
    user_query = (
        "i want to go to the INTERNATIONAL SEMANTIC WEB CONFERENCE from vienna. "
        "Book the flight and hotel for me, you dont need to get my permission for booking"
    )

    # Step 1: Dynamically select and run the chosen conference agent architecture
    print(f"\n>>> Running conference agent with architecture '{args.architecture}' and model '{args.model}'...")
    try:
        if args.architecture == "second":
            module_name = "architectures.secondconference"
        elif args.architecture == "third":
            module_name = "architectures.thirdconference"
        
        architecture_module = importlib.import_module(module_name)
        await architecture_module.main(args.model, user_query)
        print(">>> Conference agent finished successfully.")
    except Exception as e:
        logging.error(f"An error occurred while running the conference agent: {e}")
        print(f">>> Conference agent failed: {e}")
        return  # Stop the test if the agent fails

    # Step 2: Run the evaluation script
    print("\n>>> Running evaluation...")
    try:
        run_evaluation()
        print(">>> Evaluation finished successfully.")
    except Exception as e:
        logging.error(f"An error occurred during evaluation: {e}")
        print(">>> Evaluation failed. See logs for details.")

    print("\n--- Test Run Finished ---")

if __name__ == "__main__":
    asyncio.run(main())
