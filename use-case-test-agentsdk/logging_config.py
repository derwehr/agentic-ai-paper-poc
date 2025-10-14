import logging
import os


class ImportantLogFilter(logging.Filter):
    """
    This filter is used to capture only log messages that are deemed important for summary.
    It checks for specific keywords in the log message.
    """

    def filter(self, record):
        """
        Determines if a log record should be logged.
        """
        message = record.getMessage()
        return "Request options:" in message or "LLM resp:" in message

class UsageLogFilter(logging.Filter):
    """
    This filter is used to capture only log messages related to token usage.
    """
    def filter(self, record):
        """
        Determines if a log record should be logged.
        """
        return "TOKEN_USAGE" in record.getMessage()

def setup_logging():
    """
    Sets up logging for the application.
    This includes creating a logs directory, setting up file handlers for
    a full log and a summary log, and a stream handler for console output.
    The log file mode (append or write) is controlled by the LOG_FILE_MODE
    environment variable.
    """
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file_mode = os.getenv("LOG_FILE_MODE", "a").lower()
    if log_file_mode not in ["a", "w"]:
        print(
            f"Invalid LOG_FILE_MODE '{log_file_mode}', defaulting to 'a' (append)."
        )
        log_file_mode = "a"

    log_file = os.path.join(log_dir, "mcp.log")

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    # Remove any existing handlers to avoid duplicating logs
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Create file handler to save logs to a file
    file_handler = logging.FileHandler(log_file, mode=log_file_mode)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(file_handler)

    # Create stream handler to also print logs to the console
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.addHandler(stream_handler)

    # Create a handler for the summary log file
    summary_log_file = os.path.join(log_dir, "mcp_summary.log")
    summary_handler = logging.FileHandler(summary_log_file, mode=log_file_mode)
    summary_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    summary_handler.addFilter(ImportantLogFilter())
    logger.addHandler(summary_handler)

    # Create a handler for the token usage log file
    usage_log_file = os.path.join(log_dir, "token_usage.log")
    usage_handler = logging.FileHandler(usage_log_file, mode=log_file_mode)
    usage_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(message)s")
    )
    usage_handler.addFilter(UsageLogFilter())
    logger.addHandler(usage_handler)

    logging.info(
        f"Logging configured. Full log: '{log_file}', Summary log: '{summary_log_file}', Token Usage log: '{usage_log_file}', Mode: '{log_file_mode}'."
    )

