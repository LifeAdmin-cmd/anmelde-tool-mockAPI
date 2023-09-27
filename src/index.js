const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv').config({ path: '.env' })

const app = express();

app.use(bodyParser.json());

app.use('/node_modules', express.static('node_modules'));

const router = express.Router();

let mockRoutes = {};

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/mockapi.db');

app.get('/', (req, res) => {
  res.redirect('/create-mock');
});

// Initialize the database
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS mocks (route TEXT, method TEXT, status INTEGER, response TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, data TEXT)");
});

loadMocksIntoMemory();

function loadMocksIntoMemory() {
  db.all("SELECT route, method, status, response FROM mocks", [], (err, rows) => {
    if (err) {
      console.error('Error loading mocks from database:', err.message);
      return;
    }

    rows.forEach(row => {
      const routeKey = row.method + '/' + row.route;
      let response;
      try {
          typeof(row.response)
          response = JSON.parse(row.response);
      } catch (e) {
          console.error("Error parsing JSON for response:", row.response);
          response = row.response; // Fallback to the raw value
      }
      mockRoutes[routeKey] = {
        status: row.status,
        response: response,
      };
    });
  });
}

// middleware for Bearer auth
router.use((req, res, next) => {
  if (req.headers.authorization !== process.env.bearer) {
    res.status(401).send("Unauthorized");
    return;
  }
  next();
});

// mock route handling
router.all('/mock/:route', (req, res) => {
  const routeKey = req.method + '/' + req.params.route;
  const mockData = mockRoutes[routeKey];
  if (mockData) {
    res.status(mockData.status).send(mockData.response);
  } else {
    res.status(404).send('Not found');
  }
});

// UI for creating mocks
app.get('/create-mock', (req, res) => {
  res.sendFile(__dirname + '/mockUI.html');
});

// Endpoint to add mock data
app.post('/api/add-mock', (req, res) => {
  const { route, method, status, response } = req.body;

  // Ensure that the response is stringified
  const stringifiedResponse = JSON.stringify(response);

  db.run("INSERT INTO mocks (route, method, status, response) VALUES (?, ?, ?, ?)", 
      [route, method, status, stringifiedResponse], 
      function(err) {
          if (err) {
              return res.status(500).send('Error adding mock: ' + err.message);
          }
          res.send('Mock added successfully with id ' + this.lastID);
      }
  );
  loadMocksIntoMemory();
});

// Endpoint to retrieve all mocks
app.get('/api/get-mocks', (req, res) => {
  db.all("SELECT rowid AS id, route, method, status, response FROM mocks", [], (err, rows) => {
    if (err) {
      return res.status(500).send('Error fetching mocks: ' + err.message);
    }
    res.json(rows);
  });
});

// Endpoint to update a mock
app.put('/api/update-mock/:id', (req, res) => {
  const { route, method, status, response } = req.body;

  // Ensure that the response is stringified
  const stringifiedResponse = JSON.stringify(response);

  db.run("INSERT INTO mocks (route, method, status, response) VALUES (?, ?, ?, ?)", 
      [route, method, status, stringifiedResponse], 
      function(err) {
          if (err) {
              return res.status(500).send('Error adding mock: ' + err.message);
          }
          res.send('Mock added successfully with id ' + this.lastID);
      }
  );
  loadMocksIntoMemory();
});

// Endpoint to delete a mock
app.delete('/api/delete-mock/:id', (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM mocks WHERE rowid = ?", [id], function(err) {
    if (err) {
      return res.status(500).send('Error deleting mock: ' + err.message);
    }
    res.send(`Mock with id ${id} deleted successfully.`);
  });
  loadMocksIntoMemory();
});

// anmelede-tool test

app.post('/api/event/register/:id', (req, res) => {
  const eventId = req.params.id;
  const eventData = JSON.stringify(req.body);
  
  db.run("INSERT OR REPLACE INTO events (id, data) VALUES (?, ?)", [eventId, eventData], function(err) {
    if (err) {
      return res.status(500).send('Error saving event: ' + err.message);
    }
    res.send('Event saved successfully with id ' + eventId);
  });
});

app.get('/api/event/register/:id', (req, res) => {
  const eventId = req.params.id;
  
  db.get("SELECT data FROM events WHERE id = ?", [eventId], function(err, row) {
    if (err) {
      return res.status(500).send('Error retrieving event: ' + err.message);
    }
    res.json(row ? JSON.parse(row.data) : {});
  });
});

app.delete('/api/event/register/:id', (req, res) => {
  const eventId = req.params.id;

  db.run("DELETE FROM events WHERE id = ?", [eventId], function(err) {
    if (err) {
      return res.status(500).send('Error deleting event: ' + err.message);
    }
    res.send(`Event with id ${eventId} deleted successfully.`);
  });
});



app.get('/api/event/:id', (req, res) => {
  const eventId = req.params.id;

  // 1. Check if there is an event in the db with the provided id
  db.get("SELECT data FROM events WHERE id = ?", [eventId], function(err, row) {
    if (err) {
      return res.status(500).send('Error retrieving event: ' + err.message);
    }

    const jsonResponse = [
      {
        "id": "bfc564dd-8588-40bf-8ee1-fdb4dc240742",
        "createdAt": "2023-06-21T19:20:59.187755+02:00",
        "updatedAt": "2023-08-12T15:15:15.155859+02:00",
        "status": "expired",
        "name": "Ring Rhein Lippe Sippenaktion 2023",
        "shortDescription": "Ring Rhein Lippe Sippenaktion 2023",
        "longDescription": "<p>Hallo und Herzlich Willkommen zum Ring-Sippen-Tippel vom Ring Rhein Lippe. </p><p><br></p><p>Die Sippenaktion findet vom 25.08.2023-27.08.2023 statt.</p><p><br></p><p>Wir freuen uns auf alle die sich anmelden und mitkommen!</p>",
        "icon": null,
        "location": {
          "id": 3,
          "name": "Pfadfinderzeltplatz",
          "description": "",
          "zipCode": {
            "zipCode": "24852",
            "city": "Eggebek"
          },
          "address": "Tüdal 1",
          "distance": 442.07460178655384
        },
        "startDate": "2023-08-25T18:00:00+02:00",
        "endDate": "2023-08-27T13:00:00+02:00",
        "registrationDeadline": "2023-08-11T23:59:00+02:00",
        "registrationStart": "2023-05-25T00:00:00+02:00",
        "lastPossibleUpdate": "2023-08-24T18:00:00+02:00",
        "bookingOptions": [
          {
            "id": 13,
            "name": "Standard",
            "description": "",
            "price": "15.00",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "bfc564dd-8588-40bf-8ee1-fdb4dc240742",
            "tags": []
          },
          {
            "id": 14,
            "name": "Nur Samstag",
            "description": "",
            "price": "5.00",
            "bookableFrom": null,
            "bookableTill": "2023-08-25T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "bfc564dd-8588-40bf-8ee1-fdb4dc240742",
            "tags": []
          }
        ],
        "existingRegister": null
      },
      {
        "id": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
        "createdAt": "2023-06-25T16:01:25.081478+02:00",
        "updatedAt": "2023-07-16T12:49:59.494418+02:00",
        "status": "expired",
        "name": "Aufbaulager BuSiFe '23",
        "shortDescription": "Das Aufbaulager zum BuSiFe 2023",
        "longDescription": "<p><span style=\"color: rgb(17, 24, 39);\">Damit das BuSiFe ein voller Erfolg wird brauchen wir noch viele eifrig helfende Hände:)</span></p>",
        "icon": null,
        "location": {
          "id": 8,
          "name": "Köln",
          "description": "bei den Töpfen und auf dem Ringgelände Köln",
          "zipCode": {
            "zipCode": "50733",
            "city": "Köln"
          },
          "address": "-",
          "distance": 12.726666449001849
        },
        "startDate": "2023-09-04T18:00:00+02:00",
        "endDate": "2023-09-08T13:00:00+02:00",
        "registrationDeadline": "2023-09-02T23:59:00+02:00",
        "registrationStart": "2023-03-04T18:00:00+01:00",
        "lastPossibleUpdate": "2023-09-03T18:00:00+02:00",
        "bookingOptions": [
          {
            "id": 15,
            "name": "Ab Montag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 16,
            "name": "Ab Dienstag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 17,
            "name": "Ab Mittwoch",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 18,
            "name": "Ab Donnerstag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 19,
            "name": "Ab Freitag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 20,
            "name": "Nur Dienstag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          },
          {
            "id": 21,
            "name": "Nur Mittwoch",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": "2023-09-04T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "23ef4ad9-65be-4b28-8ac2-09ffa2dd2167",
            "tags": []
          }
        ],
        "existingRegister": null
      },
      {
        "id": "cac3b5ba-bdfd-49d8-8557-7cadb4b5f8d4",
        "createdAt": "2023-09-18T14:19:25.195385+02:00",
        "updatedAt": "2023-09-27T11:16:36.378500+02:00",
        "status": "pending",
        "name": "Galaxias WInterfahrt 2023/24",
        "shortDescription": "Der Stamm Galaxias lädt herzlich zur WInterfahrt 2023/24 ein",
        "longDescription": "<p>Einladung</p>",
        "icon": null,
        "location": {
          "id": 5,
          "name": "Sternwarte",
          "description": "Heim des Stamm Galaxias",
          "zipCode": {
            "zipCode": "51147",
            "city": "Köln"
          },
          "address": "Linder Höhe 2",
          "distance": 2.405799941033956
        },
        "startDate": "2023-12-31T02:00:00+01:00",
        "endDate": "2024-01-03T21:00:00+01:00",
        "registrationDeadline": "2023-12-24T07:59:00+01:00",
        "registrationStart": "2023-09-17T07:00:00+02:00",
        "lastPossibleUpdate": "2023-12-30T02:00:00+01:00",
        "bookingOptions": [
          {
            "id": 40,
            "name": "Sippe",
            "description": "",
            "price": "100.00",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "cac3b5ba-bdfd-49d8-8557-7cadb4b5f8d4",
            "tags": []
          },
          {
            "id": 44,
            "name": "Meute",
            "description": "",
            "price": "100.00",
            "bookableFrom": null,
            "bookableTill": "2023-12-31T02:00:00+01:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "cac3b5ba-bdfd-49d8-8557-7cadb4b5f8d4",
            "tags": []
          },
          {
            "id": 46,
            "name": "Rover",
            "description": "",
            "price": "100.00",
            "bookableFrom": null,
            "bookableTill": "2023-12-31T02:00:00+01:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "cac3b5ba-bdfd-49d8-8557-7cadb4b5f8d4",
            "tags": []
          }
        ],
        "existingRegister": null
      },
      {
        "id": "4ae945b2-16c4-44f6-827e-277db4e1c87d",
        "createdAt": "2023-05-19T15:02:00.185291+02:00",
        "updatedAt": "2023-06-08T11:34:45.966932+02:00",
        "status": "expired",
        "name": "Aufbaulager Bundesmeutenlager 2023",
        "shortDescription": "Aufbaulager Bundesmeutenlager 2023",
        "longDescription": "<p>Das ist das Aufbaulager für das Bundesmeutenlager</p>",
        "icon": null,
        "location": {
          "id": 4,
          "name": "Max' Hof",
          "description": "Zeltplatz von Max in Wachtendonk",
          "zipCode": {
            "zipCode": "47669",
            "city": "Wachtendonk"
          },
          "address": "Meerendonker Str. 5",
          "distance": 78.15548845711061
        },
        "startDate": "2023-06-07T18:00:00+02:00",
        "endDate": "2023-06-09T18:00:00+02:00",
        "registrationDeadline": "2023-06-06T17:59:00+02:00",
        "registrationStart": "2023-03-07T00:00:00+01:00",
        "lastPossibleUpdate": "2023-06-07T15:00:00+02:00",
        "bookingOptions": [
          {
            "id": 6,
            "name": "Ab Freitag",
            "description": "",
            "price": "0.00",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "4ae945b2-16c4-44f6-827e-277db4e1c87d",
            "tags": []
          },
          {
            "id": 7,
            "name": "Ab Donnerstag",
            "description": "",
            "price": "5.00",
            "bookableFrom": null,
            "bookableTill": "2023-06-07T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "4ae945b2-16c4-44f6-827e-277db4e1c87d",
            "tags": []
          },
          {
            "id": 8,
            "name": "Ab Mittwoch",
            "description": "",
            "price": "10.00",
            "bookableFrom": null,
            "bookableTill": "2023-06-07T18:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "4ae945b2-16c4-44f6-827e-277db4e1c87d",
            "tags": []
          }
        ],
        "existingRegister": null
      },
      {
        "id": "08a8290c-2619-4d1f-ba35-c223aff567ae",
        "createdAt": "2023-05-17T16:29:52.601479+02:00",
        "updatedAt": "2023-08-31T22:17:35.561795+02:00",
        "status": "expired",
        "name": "Bundessingefest 2023",
        "shortDescription": "Das jährliche Bundessingefest vom DPBM",
        "longDescription": "<p>Liebste Freund*Innen aus dem Bund,</p><p><br></p><p>es gibt mal wieder ein Fest zu feiern!</p><p>Dieses Jahr wird unser geliebtes Bundessingefest 35 Jahre alt und natürlich möchten wir es uns nicht nehmen lassen die Festlichkeiten am Ort ihres Ursprungs auszurichten: Bei uns im schönen Niederkassel!</p><p><br></p><p>Wir laden euch herzlich ein mit uns gemeinsam zu feiern und zu musizieren.</p><p>Schon jetzt sind wir freudig gespannt auf alle feinen Beiträge beim Kleinkunstabend und Singewettstreit.</p><p><br></p><p>Für alle Wölflinge wird es samstags ein alternatives Programm geben.</p><p><br></p><p>Damit das diesjährige Bundessingefest eine unvergessliche Sause werden kann hoffen wir natürlich, dass ihr alle mit dabei seid!</p><p><br></p><p>Zum organisatorischen Teil:</p><p><br></p><p>Bitte teilt uns die Anzahl der Wölflinge, Pfadfinder*Innen und Rover*Innen mit, eventuelle Essensunverträglichkeiten, und wie ihr anreisen werdet.&nbsp;</p><p><br></p><p>Außerdem denkt bitte an genügend Kothen- und Jurtenstangen.</p><p><br></p><p>Zu guter letzt: Liederbücher und Instrumente nicht vergessen!</p><p><br></p><p>Wir freuen uns auf euch,</p><p><br></p><p>eure Wikinger*Innen</p>",
        "icon": null,
        "location": {
          "id": 8,
          "name": "Köln",
          "description": "bei den Töpfen und auf dem Ringgelände Köln",
          "zipCode": {
            "zipCode": "50733",
            "city": "Köln"
          },
          "address": "-",
          "distance": 12.726666449001849
        },
        "startDate": "2023-09-08T18:00:00+02:00",
        "endDate": "2023-09-10T13:00:00+02:00",
        "registrationDeadline": "2023-09-03T23:59:00+02:00",
        "registrationStart": "2023-05-22T12:00:00+02:00",
        "lastPossibleUpdate": "2023-09-08T06:00:00+02:00",
        "bookingOptions": [
          {
            "id": 5,
            "name": "Standard",
            "description": "",
            "price": "25.50",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "08a8290c-2619-4d1f-ba35-c223aff567ae",
            "tags": []
          },
          {
            "id": 9,
            "name": "Tagesgast",
            "description": "",
            "price": "15.50",
            "bookableFrom": null,
            "bookableTill": "2023-09-08T06:00:00+02:00",
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "08a8290c-2619-4d1f-ba35-c223aff567ae",
            "tags": []
          }
        ],
        "existingRegister": null
      },
      {
        "id": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
        "createdAt": "2023-05-09T22:54:40.339279+02:00",
        "updatedAt": "2023-06-05T17:04:16.486507+02:00",
        "status": "expired",
        "name": "Bundesmeutenlager 2023",
        "shortDescription": "Bundesmeutenlager 2023",
        "longDescription": "<p><strong>ACHTUNG</strong>: Korrekter Lagerbeitrag ist <strong><u>22,50€!</u></strong></p><p>Die 29,50€ auf dem ersten Rundschreiben waren ein Fehler.</p>",
        "icon": null,
        "location": {
          "id": 4,
          "name": "Max' Hof",
          "description": "Zeltplatz von Max in Wachtendonk",
          "zipCode": {
            "zipCode": "47669",
            "city": "Wachtendonk"
          },
          "address": "Meerendonker Str. 5",
          "distance": 78.15548845711061
        },
        "startDate": "2023-06-09T18:00:00+02:00",
        "endDate": "2023-06-11T14:00:00+02:00",
        "registrationDeadline": "2023-06-08T11:59:00+02:00",
        "registrationStart": "2023-03-09T12:00:00+01:00",
        "lastPossibleUpdate": "2023-06-09T11:59:00+02:00",
        "bookingOptions": [
          {
            "id": 1,
            "name": "Teilnehmender",
            "description": "",
            "price": "22.50",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
            "tags": []
          },
          {
            "id": 2,
            "name": "Helfender",
            "description": "",
            "price": "22.50",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
            "tags": []
          },
          {
            "id": 3,
            "name": "Meutenführung",
            "description": "",
            "price": "22.50",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
            "tags": []
          },
          {
            "id": 4,
            "name": "Team",
            "description": "",
            "price": "11.50",
            "bookableFrom": null,
            "bookableTill": null,
            "maxParticipants": 0,
            "startDate": null,
            "endDate": null,
            "event": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
            "tags": []
          }
        ],
        "existingRegister": {
          "id": "8e308e9a-73fd-494a-9366-224317c2c473",
          "createdAt": "2023-05-24T12:00:06.604294+02:00",
          "updatedAt": "2023-05-24T12:00:06.604311+02:00",
          "isConfirmed": false,
          "scoutOrganisation": 348,
          "event": "061421ac-bda8-48d0-9a1d-cd9d278f7c6c",
          "responsiblePersons": [
            886
          ]
        }
      }
    ]

    // 2. If the event does not exist, just respond with the JSON as is
    if (!row) {
      return res.json(jsonResponse);
    }

    // 3. If the event exists in the db, modify the JSON data for the object with the id "55b24e63-4e8f-4a56-8be5-52e7c7991a25"
    const targetEvent = jsonResponse.find(event => event.id === "55b24e63-4e8f-4a56-8be5-52e7c7991a25");
    if (targetEvent) {
        targetEvent.existingRegister = true;
    }
    res.json(jsonResponse);
  })
});

app.get('/modules', (req, res) => {
  res.json(
    [
      {
        "title": "Datenschutz",
        "introText": "Am Ende bekommst du eine Bestätigungs-Email. Nur mit dieser E-Mail ist deine Anmeldung erfolgreich abgeschlossen.",
        "formFields": [
          {
            "type": "booleanAttribute",
            "id": "datenschutz",
            "label": "Ich stimme zu meine Daten bis zum Ende der Fahrt zu speichern.",
            "required": true
          },
          {
            "type": "conditionsAttribute",
            "id": "fahrtenConditions",
            "label": "Ich habe die Fahrtenbedinungen gelesen und stimme ihnen hiermit zu.",
            "linkUrl": "stammgalaxias.de/fahrtenbedinungen",
            "introText": "Die Fahrtenbedingungen können über das klicken auf den blauen Schriftzug abgerufen werden.",
            "required": true
          }
        ]
      },
      {
        "title": "Personen",
        "introText": "",
        "formFields": []
      },
      {
        "title": "Anreise",
        "introText": "Wir möchten gerne wissen wann, wo und wie du ankommst.",
        "formFields": [
          {
            "type": "travelAttribute",
            "id": "testAnreise",
            "label": "Anreise",
            "required": true
          }
        ]
      },
      {
        "title": "Zusätzliche Bemerkung",
        "introText": " Möchstest du der Lagerleitung noch etwas mitgeben? ",
        "formFields": [
          {
            "type": "textAttribute",
            "id": "additionalNotice",
            "label": "Zusätzliche Nachricht",
            "required": false
          }
        ]
      },
      {
        "title": "Zusammenfassung",
        "introText": "",
        "formFields": [
          {
            "type": "summaryAttribute"
          },
          {
            "type": "booleanAttribute",
            "id": "verbindlicheAnmeldung",
            "label": "Die oben stehenden Daten sind korrekt und möchte ich die genannten Personen verbindlich zu dieser Fahrt anmelden.",
            "required": true
          }
        ]
      }
    ]
  );
});

app.use('/', router);

app.listen(3042, () => {
  console.log('listening on port 3042');
});
