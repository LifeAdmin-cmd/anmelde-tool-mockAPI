const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv').config({ path: '.env' })
const fahrtenJson =  require('./fahrten.json'); 
const modules = require('./modules.json');

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

    const jsonResponse = fahrtenJson;
    console.log(jsonResponse);

    // 2. If the event does not exist, just respond with the JSON as is
    if (!row) {
      return res.json(jsonResponse);
    }

    // 3. If the event exists in the db, modify the JSON data for the object with the id "55b24e63-4e8f-4a56-8be5-52e7c7991a25"
    const targetEvent = jsonResponse.find(event => event.id === "cac3b5ba-bdfd-49d8-8557-7cadb4b5f8d4");
    if (targetEvent) {
        targetEvent.existingRegister = true;
    }
    res.json(jsonResponse);
  })
});

app.get('/modules', (req, res) => {
  res.json(modules);
});

app.use('/', router);

app.listen(3042, () => {
  console.log('listening on port 3042');
});
