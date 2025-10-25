import { Servient } from '@node-wot/core';
import httpBinding from '@node-wot/binding-http';

const { HttpClientFactory } = httpBinding;
const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

const departureCity = "NUE";

async function travelUseCase() {
    // Setup WoT
    const WoT = await servient.start();
    const confTd = await WoT.requestThingDescription('http://localhost:8043/conferencefinder');

    // Conference Finder Thing
    const confThing = await WoT.consume(confTd);
    const interactionOutput = await confThing.readProperty('conferences');
    const conferences = await interactionOutput.value() as Array<{ name: string, location: string, startDate: string, endDate: string }>;
    console.log('Conferences:', conferences);

    // Select random conference
    const selectedConference = conferences[Math.floor(Math.random() * conferences.length)];
    console.log('Selected Conference:', selectedConference);

    // Travel planner Thing
    const travelTd = await WoT.requestThingDescription('http://localhost:8043/travel');
    const travelThing = await WoT.consume(travelTd);

    // Get flight prices
    const flights = await travelThing.invokeAction("findFlight", {
        "from": departureCity,
        "to": selectedConference.location,
        "departureDate": selectedConference.startDate,
        "returnDate": selectedConference.endDate
    });
    console.log('Flights:', await flights?.value());

    // Get hotel prices
    const hotels = await travelThing.invokeAction("findHotels", {
        "location": selectedConference.location,
        "checkInDate": selectedConference.startDate,
        "checkOutDate": selectedConference.endDate
    });
    console.log('Hotels:', hotels);
}

travelUseCase();
