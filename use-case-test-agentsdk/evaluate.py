import re
import json
import logging
import os
import codecs

def setup_evaluation_logging():
    """Sets up a dedicated logger for the evaluation results."""
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    eval_log_file = os.path.join(log_dir, "evaluation.log")
    
    logger = logging.getLogger('evaluation')
    logger.setLevel(logging.INFO)
    
    # Prevent logs from propagating to the root logger
    logger.propagate = False

    # Remove existing handlers to avoid duplication
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Add a file handler to write evaluation results
    file_handler = logging.FileHandler(eval_log_file, mode='w')
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(file_handler)
    
    return logger

def parse_log_for_bookings(log_file="logs/mcp.log"):
    """Parses the log file to find flight and hotel booking confirmations."""
    try:
        # Open with a robust encoding setting
        with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
            log_content = f.read()
    except FileNotFoundError:
        return None, None

    flight_booking = None
    hotel_booking = None

    # Regex to find the JSON data within the text content of the log
    flight_pattern = re.search(r"MCP tool book_flight returned.*?text='({.*?})'", log_content, re.DOTALL)
    hotel_pattern = re.search(r"MCP tool book_hotel returned.*?text='({.*?})'", log_content, re.DOTALL)

    if flight_pattern:
        try:
            flight_data_str = flight_pattern.group(1)
            # The string from the log is escaped, so we need to unescape it
            unescaped_flight_str = codecs.decode(flight_data_str, 'unicode_escape')
            flight_booking = json.loads(unescaped_flight_str)
        except (json.JSONDecodeError, IndexError):
            pass # Failed to parse

    if hotel_pattern:
        try:
            hotel_data_str = hotel_pattern.group(1)
            # The string from the log is escaped, so we need to unescape it
            unescaped_hotel_str = codecs.decode(hotel_data_str, 'unicode_escape')
            hotel_booking = json.loads(unescaped_hotel_str)
        except (json.JSONDecodeError, IndexError):
            pass # Failed to parse

    return flight_booking, hotel_booking

def evaluate_bookings(flight_booking, hotel_booking):
    """Evaluates if the extracted bookings match the expected conference data."""
    results = {
        "flight_booking_valid": False,
        "hotel_booking_valid": False,
        "score": 0.0,
        "total_possible_score": 2.0,
        "errors": []
    }
    
    # Expected data for ISWC 2025
    expected_flight_id = "CONF-FLIGHT-NARA"
    expected_arrival_date = "2025-11-01"
    expected_return_date = "2025-11-07"
    expected_hotel_id = "ISWC-OFFER-1"
    expected_check_in = "2025-11-01"
    expected_check_out = "2025-11-07"

    # Validate Flight Booking
    flight_errors = []
    if not flight_booking:
        flight_errors.append("Flight booking not found in logs.")
    else:
        details = flight_booking.get('details', {})
        if details.get('id') != expected_flight_id:
            flight_errors.append(f"Incorrect flight booked. Expected ID '{expected_flight_id}', got '{details.get('id')}'.")
        
        arrival_date = details.get('itineraries', [{}])[0].get('segments', [{}])[0].get('arrival', {}).get('at', '')
        if not arrival_date.startswith(expected_arrival_date):
            flight_errors.append(f"Incorrect arrival date. Expected '{expected_arrival_date}', got '{arrival_date}'.")
            
        return_date = details.get('itineraries', [{}, {}])[1].get('segments', [{}])[0].get('departure', {}).get('at', '')
        if not return_date.startswith(expected_return_date):
            flight_errors.append(f"Incorrect return date. Expected '{expected_return_date}', got '{return_date}'.")
    
    if not flight_errors:
        results["flight_booking_valid"] = True
        results["score"] += 1.0
    else:
        results["errors"].extend(flight_errors)

    # Validate Hotel Booking
    hotel_errors = []
    if not hotel_booking:
        hotel_errors.append("Hotel booking not found in logs.")
    else:
        details = hotel_booking.get('details', {})
        offer = details.get('offer', {})
        if offer.get('id') != expected_hotel_id:
            hotel_errors.append(f"Incorrect hotel booked. Expected ID '{expected_hotel_id}', got '{offer.get('id')}'.")
        if offer.get('checkInDate') != expected_check_in:
            hotel_errors.append(f"Incorrect check-in date. Expected '{expected_check_in}', got '{offer.get('checkInDate')}'.")
        if offer.get('checkOutDate') != expected_check_out:
            hotel_errors.append(f"Incorrect check-out date. Expected '{expected_check_out}', got '{offer.get('checkOutDate')}'.")
    
    if not hotel_errors:
        results["hotel_booking_valid"] = True
        results["score"] += 1.0
    else:
        results["errors"].extend(hotel_errors)
            
    return results

def main():
    """Main function to run the evaluation."""
    logger = setup_evaluation_logging()
    logger.info("Starting evaluation...")

    flight_booking, hotel_booking = parse_log_for_bookings()
    
    results = evaluate_bookings(flight_booking, hotel_booking)
    
    # Log detailed results
    flight_status = "VALID" if results["flight_booking_valid"] else "INVALID"
    hotel_status = "VALID" if results["hotel_booking_valid"] else "INVALID"
    
    logger.info(f"Flight Booking Status: {flight_status}")
    logger.info(f"Hotel Booking Status: {hotel_status}")
    logger.info(f"Overall Score: {results['score']}/{results['total_possible_score']}")
    
    print(f"Flight Booking Status: {flight_status}")
    print(f"Hotel Booking Status: {hotel_status}")
    print(f"Overall Score: {results['score']}/{results['total_possible_score']}")

    if results["errors"]:
        logger.error("Evaluation FAILED: Invalid bookings found.")
        print("\nEvaluation FAILED: Invalid bookings found.")
        for error in results["errors"]:
            logger.error(f"- {error}")
            print(f"- {error}")
    else:
        logger.info("Evaluation PASSED: All bookings are valid.")
        print("\nEvaluation PASSED: All bookings are valid.")

    logger.info("Evaluation finished.")

if __name__ == "__main__":
    main()
