import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { conferenceHotelOffers, conferenceFlightOffers, conferenceNearestAirports } from "./mock-data.js";

const server = new McpServer({
  name: "mcp-booking-mock",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.registerTool(
  "search_flight_offers",
  {
    description: "Searches for flight offers between two locations for specified dates.",
    inputSchema: {
      originLocationCode: z
        .string()
        .describe("IATA code of the departure city/airport (e.g., SYD for Sydney)"),
      destinationLocationCode: z
        .string()
        .describe(
          "IATA code of the destination city/airport (e.g., BKK for Bangkok)"
        ),
      departureDate: z
        .string()
        .describe("Departure date in ISO 8601 format (YYYY-MM-DD, e.g., 2025-05-02)"),
      adults: z.number().int().min(1).max(9).describe("Number of adult travelers (age 12+), must be 1-9"),
      returnDate: z.string().optional().describe("Return date in ISO 8601 format (YYYY-MM-DD), if round-trip is desired"),
      children: z.number().int().optional().describe("Number of child travelers (age 2-11)"),
      infants: z.number().int().optional().describe("Number of infant travelers (age <= 2)"),
      travelClass: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional().describe("Travel class (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST)"),
      includedAirlineCodes: z.string().optional().describe("Comma-separated IATA airline codes to include (e.g., '6X,7X')"),
      excludedAirlineCodes: z.string().optional().describe("Comma-separated IATA airline codes to exclude (e.g., '6X,7X')"),
      nonStop: z.boolean().optional().describe("If true, only non-stop flights are returned"),
      currencyCode: z.string().optional().describe("ISO 4217 currency code (e.g., EUR for Euro)"),
      maxPrice: z.number().int().optional().describe("Maximum price per traveler, positive integer with no decimals"),
      max: z.number().int().optional().default(250).describe("Maximum number of flight offers to return"),
    },
  },
  async (input) => {
    // Check for conference-specific flights
    if (input.destinationLocationCode === 'KIX' || input.destinationLocationCode === 'TRS') {
        const offers = conferenceFlightOffers[input.destinationLocationCode as keyof typeof conferenceFlightOffers];
        if (offers) {
            return {
                content: [{ type: "text", text: JSON.stringify(offers, null, 2) }]
            };
        }
    }
    
    return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ data: [] }), // Return empty data if no conference match
          },
        ],
      };
  }
);

server.registerTool(
  "get_nearest_airports",
  {
    description: "Provides a list of commercial airports within a radius of a given geographic point, ordered by relevance.",
    inputSchema: {
      latitude: z.number().describe("Latitude of the central point for the search (e.g., 51.57285)."),
      longitude: z.number().describe("Longitude of the central point for the search (e.g., -0.44161)."),
      radius: z.number().int().optional().default(300).describe("Radius of the search in Kilometers (0 to 500, default should be 300)."),
      sort: z.enum(['relevance', 'distance', 'analytics.flights.score', 'analytics.travelers.score']).optional().describe("How to sort the results."),
    },
  },
  async (input) => {
    // Check if the coordinates are close to Nara, Japan (34.685, 135.805)
    if (Math.abs(input.latitude - 34.685) < 1 && Math.abs(input.longitude - 135.805) < 1) {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceNearestAirports["Nara, Japan"], null, 2) }],
        };
    }
    // Check if the coordinates are close to Portorož, Slovenia (45.514, 13.591)
    if (Math.abs(input.latitude - 45.514) < 1 && Math.abs(input.longitude - 13.591) < 1) {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceNearestAirports["Portorož, Slovenia"], null, 2) }],
        };
    }
    // Check if the coordinates are close to Vienna, Austria (48.208, 16.371)
    if (Math.abs(input.latitude - 48.208) < 1 && Math.abs(input.longitude - 16.371) < 1) {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceNearestAirports["Vienna, Austria"], null, 2) }],
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify({ data: [] }) }],
      };
  }
);

const AMENITIES_ENUM = z.enum([
  "FITNESS_CENTER", "AIR_CONDITIONING", "RESTAURANT", "PARKING", "PETS_ALLOWED",
  "AIRPORT_SHUTTLE", "BUSINESS_CENTER", "DISABLED_FACILITIES", "WIFI", "MEETING_ROOMS",
  "NO_KID_ALLOWED", "TENNIS", "GOLF", "KITCHEN", "ANIMAL_WATCHING", "BABY-SITTING",
  "BEACH", "CASINO", "JACUZZI", "SAUNA", "SOLARIUM", "MASSAGE", "VALET_PARKING",
  "BAR", "LOUNGE", "KIDS_WELCOME", "NO_PORN_FILMS", "MINIBAR", "TELEVISION",
  "WI-FI_IN_ROOM", "ROOM_SERVICE", "GUARDED_PARKG", "SERV_SPEC_MENU", "SWIMMING_POOL"
]);

server.registerTool(
  "search_hotels_by_city",
  {
    description: "Searches for available hotels in a given city and returns their offers.",
    inputSchema: {
      cityCode: z.string().describe("IATA code of the city (e.g., PAR for Paris)."),
      checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format."),
      checkOutDate: z.string().describe("Check-out date in YYYY-MM-DD format."),
      adults: z.number().int().optional().default(1).describe("Number of adult guests."),
      radius: z.number().int().optional().describe("Radius around the city center to search within."),
      radiusUnit: z.enum(["KM", "MILE"]).optional().describe("Unit for the radius (kilometers or miles)."),
      chainCodes: z.string().optional().describe("Comma-separated list of hotel chain codes to filter by."),
      amenities: z.array(AMENITIES_ENUM).optional().describe("List of amenities to filter by."),
      ratings: z.string().optional().describe("Comma-separated list of star ratings to filter by (e.g., '4,5').")
    }
  },
  async (input) => {
    if (input.cityCode === 'Nara' || input.cityCode === 'OSA') { // OSA for Osaka, near Nara
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceHotelOffers["Nara, Japan"], null, 2) }],
        };
    }
    if (input.cityCode === 'Portorož' || input.cityCode === 'POW') {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceHotelOffers["Portorož, Slovenia"], null, 2) }],
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify({ data: [] }) }],
      };
  }
);

server.registerTool(
  "search_hotels_by_geocode",
  {
    description: "Searches for available hotels near a given their latitude and longitude and returns their offers.",
    inputSchema: {
      latitude: z.number().describe("Latitude for the search center."),
      longitude: z.number().describe("Longitude for the search center."),
      radius: z.number().int().optional().default(15).describe("Radius around the geocode to search within. Defaults to 15."),
      radiusUnit: z.enum(["KM", "MILE"]).optional().default("KM").describe("Unit for the radius (kilometers or miles). Defaults to KM."),
      checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format."),
      checkOutDate: z.string().describe("Check-out date in YYYY-MM-DD format."),
      adults: z.number().int().optional().default(1).describe("Number of adult guests."),
      amenities: z.array(AMENITIES_ENUM).optional().describe("List of amenities to filter by."),
      ratings: z.string().optional().describe("Comma-separated list of star ratings to filter by (e.g., '4,5').")
    }
  },
  async (input) => {
    // Check if the coordinates are close to Nara, Japan (34.685, 135.805)
    if (Math.abs(input.latitude - 34.685) < 1 && Math.abs(input.longitude - 135.805) < 1) {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceHotelOffers["Nara, Japan"], null, 2) }],
        };
    }
    // Check if the coordinates are close to Portorož, Slovenia (45.514, 13.591)
    if (Math.abs(input.latitude - 45.514) < 1 && Math.abs(input.longitude - 13.591) < 1) {
        return {
            content: [{ type: "text", text: JSON.stringify(conferenceHotelOffers["Portorož, Slovenia"], null, 2) }],
        };
    }
    return {
        content: [{ type: "text", text: JSON.stringify({ data: [] }) }],
      };
  }
);

server.registerTool(
  "get_hotel_offers",
  {
    description: "Gets available hotel offers for a given set of hotel IDs.",
    inputSchema: {
      hotelIds: z.string().describe("Comma-separated list of Amadeus hotel IDs."),
      adults: z.number().int().describe("Number of adult guests."),
      checkInDate: z.string().describe("Check-in date in YYYY-MM-DD format."),
      checkOutDate: z.string().optional().describe("Check-out date in YYYY-MM-DD format."),
      roomQuantity: z.number().int().optional().describe("Number of rooms required."),
    },
  },
  async (input) => {
    const requestedIds = input.hotelIds.split(',');
    const offers = [];

    if (requestedIds.includes("JWNARJP")) {
        offers.push(...conferenceHotelOffers["Nara, Japan"].data);
    }
    if (requestedIds.includes("KEMPPOR")) {
        offers.push(...conferenceHotelOffers["Portorož, Slovenia"].data);
    }

    return {
        content: [{ type: "text", text: JSON.stringify({ data: offers }, null, 2) }],
      };
  }
);

server.registerTool(
  "book_flight",
  {
    description: "Books a flight based on a flight offer ID.",
    inputSchema: {
      flightOfferId: z.string().describe("The ID of the flight offer to book (e.g., 'CONF-FLIGHT-NARA')."),
    },
  },
  async ({ flightOfferId }) => {
    let bookedFlight = null;
    if (conferenceFlightOffers.KIX.data[0].id === flightOfferId) {
        bookedFlight = conferenceFlightOffers.KIX.data[0];
    } else if (conferenceFlightOffers.TRS.data[0].id === flightOfferId) {
        bookedFlight = conferenceFlightOffers.TRS.data[0];
    }

    if (bookedFlight) {
        const details = {
            id: bookedFlight.id,
            itineraries: bookedFlight.itineraries,
            price: bookedFlight.price
        };
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "Successfully booked flight.",
                    details: details
                }, null, 2)
            }]
        };
    } else {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "Booking failed.",
                    error: "Flight offer ID not found."
                }, null, 2)
            }]
        };
    }
  }
);

server.registerTool(
  "book_hotel",
  {
    description: "Books a hotel based on a hotel offer ID.",
    inputSchema: {
      hotelOfferId: z.string().describe("The ID of the hotel offer to book (e.g., 'ISWC-OFFER-1')."),
    },
  },
  async ({ hotelOfferId }) => {
    let bookedHotelOffer = null;
    let hotelDetails = null;

    if (conferenceHotelOffers["Nara, Japan"].data[0].offers[0].id === hotelOfferId) {
        bookedHotelOffer = conferenceHotelOffers["Nara, Japan"].data[0].offers[0];
        hotelDetails = conferenceHotelOffers["Nara, Japan"].data[0].hotel;
    } else if (conferenceHotelOffers["Portorož, Slovenia"].data[0].offers[0].id === hotelOfferId) {
        bookedHotelOffer = conferenceHotelOffers["Portorož, Slovenia"].data[0].offers[0];
        hotelDetails = conferenceHotelOffers["Portorož, Slovenia"].data[0].hotel;
    }

    if (bookedHotelOffer && hotelDetails) {
        const details = {
            hotel: hotelDetails,
            offer: bookedHotelOffer
        };
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "Successfully booked hotel.",
                    details: details
                }, null, 2)
            }]
        };
    } else {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "Booking failed.",
                    error: "Hotel offer ID not found."
                }, null, 2)
            }]
        };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("booking-mock MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
