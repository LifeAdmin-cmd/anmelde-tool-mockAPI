const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv').config({ path: '.env' })

// defining the Express app
const app = express();

// definging router
const router = express.Router();

// router function for Bearer auth
router.use((req, res, next) => {
  if (req.headers.authorization !== process.env.bearer) {
    res.status(401);
    res.send("Unauthorized");
    return;
  }
  next();
})

// adding Helmet for API's security
app.use(helmet());

// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());

// enabling CORS for all requests
app.use(cors());

// adding morgan to log HTTP requests
app.use(morgan('combined'));

// test endpoint
router.get('/api/v1/test', (req, res) => {
  // if authorized, send test response
  fetch("https://swapi.dev/api/planets/10/").then((response) => response.json()).then((data) => res.send(data));
});

// mounting router to the app
app.use('/', router);

// starting the server
app.listen(3042, () => {
  console.log('listening on port 3042');
});
