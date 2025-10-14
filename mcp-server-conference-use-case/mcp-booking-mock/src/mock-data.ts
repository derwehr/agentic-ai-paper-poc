export const conferenceNearestAirports = {
    "Nara, Japan": {
        data: [
            {
                "name": "KANSAI INTERNATIONAL",
                "iataCode": "KIX",
                "distance": { "value": 70, "unit": "KM" }
            },
            {
                "name": "OSAKA INTERNATIONAL",
                "iataCode": "ITM",
                "distance": { "value": 45, "unit": "KM" }
            }
        ]
    },
    "Portorož, Slovenia": {
        data: [
            {
                "name": "RONCHI DEI LEGIONARI",
                "iataCode": "TRS",
                "distance": { "value": 35, "unit": "KM" }
            },
            {
                "name": "MARCO POLO",
                "iataCode": "VCE",
                "distance": { "value": 97, "unit": "KM" }
            }
        ]
    },
    "Vienna, Austria": {
        data: [
            {
                "name": "VIENNA INTERNATIONAL",
                "iataCode": "VIE",
                "distance": { "value": 18, "unit": "KM" }
            }
        ]
    }
};

export const conferenceFlightOffers = {
    "KIX": { // Kansai International for Nara
        data: [{
            type: "flight-offer",
            id: "CONF-FLIGHT-NARA",
            itineraries: [
                { // Outbound
                    segments: [{
                        departure: { iataCode: "VIE", at: "2025-10-31T18:00:00" }, // Vienna as origin
                        arrival: { iataCode: "KIX", at: "2025-11-01T12:00:00" }, // Arrives day before
                        carrierCode: "OS",
                        number: "51"
                    }]
                },
                { // Inbound
                    segments: [{
                        departure: { iataCode: "KIX", at: "2025-11-07T14:00:00" }, // Departs day after
                        arrival: { iataCode: "VIE", at: "2025-11-07T19:00:00" },
                        carrierCode: "OS",
                        number: "52"
                    }]
                }
            ],
            price: { currency: "EUR", total: "1250.00" } // Adjusted price for round-trip
        }]
    },
    "TRS": { // Trieste for Portorož
        data: [{
            type: "flight-offer",
            id: "CONF-FLIGHT-PORTOROZ",
            itineraries: [
                { // Outbound
                    segments: [{
                        departure: { iataCode: "VIE", at: "2025-11-30T10:00:00" }, // Vienna as origin
                        arrival: { iataCode: "TRS", at: "2025-11-30T11:00:00" }, // Arrives day before
                        carrierCode: "OS",
                        number: "227"
                    }]
                },
                { // Inbound
                    segments: [{
                        departure: { iataCode: "TRS", at: "2025-12-06T13:00:00" }, // Departs day after
                        arrival: { iataCode: "VIE", at: "2025-12-06T14:00:00" },
                        carrierCode: "OS",
                        number: "228"
                    }]
                }
            ],
            price: { currency: "EUR", total: "280.00" } // Adjusted price for round-trip
        }]
    }
};

export const conferenceHotelOffers = {
    "Nara, Japan": {
        data: [
            {
                "type": "hotel-offers",
                "hotel": {
                    "type": "hotel",
                    "hotelId": "JWNARJP",
                    "chainCode": "JW",
                    "name": "JW Marriott Hotel Nara",
                    "cityCode": "OSA", // Assuming Osaka as the major city hub
                },
                "available": true,
                "offers": [
                    {
                        "id": "ISWC-OFFER-1",
                        "checkInDate": "2025-11-01",
                        "checkOutDate": "2025-11-07",
                        "price": {
                            "currency": "JPY",
                            "total": "510000.00" // 6 nights
                        }
                    }
                ]
            }
        ]
    },
    "Portorož, Slovenia": {
        data: [
            {
                "type": "hotel-offers",
                "hotel": {
                    "type": "hotel",
                    "hotelId": "KEMPPOR",
                    "chainCode": "KE",
                    "name": "Kempinski Palace Portoroz",
                    "cityCode": "POW", 
                },
                "available": true,
                "offers": [
                    {
                        "id": "ESWC-OFFER-1",
                        "checkInDate": "2025-11-30",
                        "checkOutDate": "2025-12-06",
                        "price": {
                            "currency": "EUR",
                            "total": "1500.00" // 6 nights
                        }
                    }
                ]
            }
        ]
    }
};
