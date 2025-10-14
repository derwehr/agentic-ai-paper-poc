# Conference Trip Planning Conversation Summary (Mock Server Example)

This document summarizes a conversation with an AI assistant for planning a trip to the ISWC conference, using a set of mock MCP servers orchestrated by a central registry.

## Conversation Flow

1.  **User:** "i want to go to a conference"
2.  **Assistant:** "Of course. Which conference are you interested in, and where will you be departing from?"
3.  **User:** "I'm interested in the ISWC conference. I'll be departing from Vienna."
4.  **Assistant:** Acknowledges the request and begins planning by searching for a server that can provide conference information.

    *   **Tool Call:** `mcp_mcp-registry-conferences_search_servers(query="conference discovery")`
        *   **Result:** The registry returns the `mcp-conference-discovery-mock` server.
    *   **Tool Call:** `mcp_mcp-conference-discovery-mock_search_conferences(query="ISWC")`
        *   **Result:** Found "ISWC 2025" in Nara, Japan from November 2-6, 2025.

5.  **Assistant:** Relays the conference details and proceeds to find the locations' coordinates.

    *   **Tool Call:** `mcp_mcp-registry-conferences_search_servers(query="mediation helpers")`
        *   **Result:** The registry returns the `mcp-conference-mediation-helpers-mock` server.
    *   **Tool Call:** `mcp_mcp-conference-mediation-helpers-mock_get_coordinates(address="Nara, Japan")`
        *   **Result:** Retrieved mock coordinates for Nara (Latitude: 34.6833362, Longitude: 135.8052412).
    *   **Tool Call:** `mcp_mcp-conference-mediation-helpers-mock_get_coordinates(address="Vienna")`
        *   **Result:** Retrieved mock coordinates for Vienna (Latitude: 48.2082, Longitude: 16.3738).

6.  **Assistant:** Confirms receipt of coordinates and moves to find nearby airports.

    *   **Tool Call:** `mcp_mcp-registry-conferences_search_servers(query="booking")`
        *   **Result:** The registry returns the `mcp-booking-mock` server.
    *   **Tool Call:** `mcp_mcp-booking-mock_get_nearest_airports(latitude=34.6833362, longitude=135.8052412)`
        *   **Result:** Found Kansai International Airport (KIX) for Nara.
    *   **Tool Call:** `mcp_mcp-booking-mock_get_nearest_airports(latitude=48.2082, longitude=16.3738)`
        *   **Result:** Found Vienna International Airport (VIE) for Vienna.

7.  **Assistant:** Confirms the airports and proceeds to search for flights (arriving one day before and leaving one day after the conference).

    *   **Tool Call:** `mcp_mcp-booking-mock_search_flight_offers(adults=1, departureDate="2025-11-01", destinationLocationCode="KIX", originLocationCode="VIE", returnDate="2025-11-07")`
        *   **Result:** Found a mock non-stop flight for 850.00 EUR.

8.  **Assistant:** Presents the flight option and moves on to find a hotel.

    *   **Tool Call:** `mcp_mcp-booking-mock_search_hotels_by_geocode(adults=1, checkInDate="2025-11-01", checkOutDate="2025-11-07", latitude=34.6833362, longitude=135.8052412)`
        *   **Result:** Found "JW Marriott Hotel Nara" for 1200.00 EUR.

9.  **Assistant:** Summarizes all the gathered trip details (conference, flight, hotel) and asks the user for confirmation to book.
10. **User:** "Looks good, please book it."
11. **Assistant:** Proceeds to "book" the flight and hotel using the mock booking server.

    *   **Tool Call:** `mcp_mcp-booking-mock_book_flight(flightOfferId="CONF-FLIGHT-NARA")`
        *   **Result:** Successfully booked flight.
    *   **Tool Call:** `mcp_mcp-booking-mock_book_hotel(hotelOfferId="ISWC-OFFER-1")`
        *   **Result:** Successfully booked hotel.

12. **Assistant:** Confirms that the flight and hotel have been successfully booked and provides the final details.
