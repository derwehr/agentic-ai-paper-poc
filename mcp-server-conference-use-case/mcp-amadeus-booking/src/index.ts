import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Amadeus from "amadeus";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configure dotenv to load the .env file from the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
console.error(`Attempting to load .env file from: ${envPath}`);
dotenv.config({ path: envPath });

if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
  throw new Error(
    "AMADEUS_API_KEY and AMADEUS_API_SECRET must be set as environment variables"
  );
}

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
});

const server = new McpServer({
  name: "mcp-amadeus-booking",
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
    const { adults, children, infants } = input;
    if (children && infants && adults && (adults + children > 9)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Total number of seated travelers (adults + children) cannot exceed 9" }) }],
      };
    }

    if (infants && adults && (infants > adults)) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Number of infants cannot exceed number of adults" }) }],
      };
    }

    try {
      const response = await amadeus.shopping.flightOffersSearch.get(input);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.body, null, 2),
          },
        ],
      };
    } catch (error: any) {
      const errorDetails = error.response?.data ?? error.description ?? error.toString();
      const errorMsg = `Amadeus API error: ${JSON.stringify(errorDetails, null, 2)}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: errorMsg }),
          },
        ],
      };
    }
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
    try {
      const response = await amadeus.referenceData.locations.airports.get(input);
      return {
        content: [{ type: "text", text: JSON.stringify(response.body, null, 2) }],
      };
    } catch (error: any) {
      const errorDetails = error.response?.data ?? error.description ?? error.toString();
      const errorMsg = `Amadeus API error: ${JSON.stringify(errorDetails, null, 2)}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
      };
    }
  }
);

server.registerPrompt(
  "flight_search_prompt",
  {
    title: "Flight Search Prompt",
    description: "Create a flight search prompt",
    argsSchema: {
      origin: z.string().describe("The departure city or IATA code."),
      destination: z.string().describe("The destination city or IATA code."),
      date: z.string().describe("The desired departure date in YYYY-MM-DD format."),
    },
  },
  async ({ origin, destination, date }) => {
    const promptText = `Please search for flights from ${origin} to ${destination} on ${date}.\n\nI'd like to see options sorted by price, with information about the airlines, departure/arrival times, and any layovers.`;

    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      }],
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
    const {
      cityCode,
      radius,
      radiusUnit,
      chainCodes,
      amenities,
      ratings,
      checkInDate,
      checkOutDate,
      adults
    } = input;

    try {
      // Step 1: Find all hotel IDs for the given city and criteria
      const hotelListResponse = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode,
        radius,
        radiusUnit,
        chainCodes,
        amenities,
        ratings,
      });

      if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
        return {
          content: [{ type: "text", text: "No hotels found matching the specified criteria." }],
        };
      }

      const hotelIds = hotelListResponse.data.map((hotel: any) => hotel.hotelId);
      const allOffers: any[] = [];
      const chunkSize = 75; // Check hotels in chunks to stay under the URI limit

      // Step 2: Iterate through chunks of hotel IDs to find available offers
      for (let i = 0; i < hotelIds.length; i += chunkSize) {
        const chunk = hotelIds.slice(i, i + chunkSize);
        
        try {
            const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
                hotelIds: chunk.join(','),
                checkInDate,
                checkOutDate,
                adults,
            });

            if (offersResponse.data && offersResponse.data.length > 0) {
                allOffers.push(...offersResponse.data);
            }

            // Stop searching if we have a reasonable number of offers to return
            if (allOffers.length >= 20) {
                break;
            }
        } catch (offerError) {
            // It's possible a batch of hotels has no offers, which can be an error.
            // We'll log it and continue to the next chunk.
            console.error(`Error fetching offers for a chunk of hotels:`, offerError);
        }
      }

      if (allOffers.length === 0) {
        return {
          content: [{ type: "text", text: "No available hotel offers found for the specified dates and criteria." }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(allOffers, null, 2) }],
      };

    } catch (error: any) {
      const errorDetails = error.response?.data ?? error.description ?? error.toString();
      const errorMsg = `Amadeus API error: ${JSON.stringify(errorDetails, null, 2)}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
      };
    }
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
    const {
      latitude,
      longitude,
      radius,
      radiusUnit,
      amenities,
      ratings,
      checkInDate,
      checkOutDate,
      adults
    } = input;

    try {
      // Step 1: Find all hotel IDs for the given geocode and criteria
      const hotelListResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
        latitude,
        longitude,
        radius,
        radiusUnit,
        amenities,
        ratings,
      });

      if (!hotelListResponse.data || hotelListResponse.data.length === 0) {
        return {
          content: [{ type: "text", text: "No hotels found matching the specified criteria." }],
        };
      }

      const hotelIds = hotelListResponse.data.map((hotel: any) => hotel.hotelId);
      const allOffers: any[] = [];
      const chunkSize = 75; // Check hotels in chunks to stay under the URI limit

      // Step 2: Iterate through chunks of hotel IDs to find available offers
      for (let i = 0; i < hotelIds.length; i += chunkSize) {
        const chunk = hotelIds.slice(i, i + chunkSize);
        
        try {
            const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
                hotelIds: chunk.join(','),
                checkInDate,
                checkOutDate,
                adults,
            });

            if (offersResponse.data && offersResponse.data.length > 0) {
                allOffers.push(...offersResponse.data);
            }

            // Stop searching if we have a reasonable number of offers to return
            if (allOffers.length >= 20) {
                break;
            }
        } catch (offerError) {
            // It's possible a batch of hotels has no offers, which can be an error.
            // We'll log it and continue to the next chunk.
            console.error(`Error fetching offers for a chunk of hotels:`, offerError);
        }
      }

      if (allOffers.length === 0) {
        return {
          content: [{ type: "text", text: "No available hotel offers found for the specified dates and criteria." }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(allOffers, null, 2) }],
      };

    } catch (error: any) {
      const errorDetails = error.response?.data ?? error.description ?? error.toString();
      const errorMsg = `Amadeus API error: ${JSON.stringify(errorDetails, null, 2)}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
      };
    }
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
    try {
      const response = await amadeus.shopping.hotelOffersSearch.get(input);
      return {
        content: [{ type: "text", text: JSON.stringify(response.body, null, 2) }],
      };
    } catch (error: any) {
      const errorDetails = error.response?.data ?? error.description ?? error.toString();
      const errorMsg = `Amadeus API error: ${JSON.stringify(errorDetails, null, 2)}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("amadeus-booking-mcp MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
