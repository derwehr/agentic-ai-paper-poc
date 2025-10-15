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

    # --- Handlers Configuration ---
    # We define all handlers that will be attached to the root logger.
    
    file_handler = logging.FileHandler(log_file, mode=log_file_mode)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    summary_log_file = os.path.join(log_dir, "mcp_summary.log")
    summary_handler = logging.FileHandler(summary_log_file, mode=log_file_mode)
    summary_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    summary_handler.addFilter(ImportantLogFilter())
    usage_log_file = os.path.join(log_dir, "token_usage.log")
    usage_handler = logging.FileHandler(usage_log_file, mode=log_file_mode)
    usage_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(message)s")
    )
    usage_handler.addFilter(UsageLogFilter())

    # --- Root Logger Configuration ---
    # Configure the root logger, which will receive messages from all child loggers.
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    # Remove any existing handlers to start fresh
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    # Add our configured handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)
    root_logger.addHandler(summary_handler)
    root_logger.addHandler(usage_handler)

    # --- Library Logger Configuration ---
    # Ensure library loggers are set to DEBUG and propagate their messages to root.
    for logger_name in ['agents', 'a2a']:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.DEBUG)
        logger.propagate = True
        # Remove any pre-existing handlers from the libraries to prevent duplicate output
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)

    logging.info(
        f"Logging configured. Full log: '{log_file}', Summary log: '{summary_log_file}', Token Usage log: '{usage_log_file}', Mode: '{log_file_mode}'."
    )

