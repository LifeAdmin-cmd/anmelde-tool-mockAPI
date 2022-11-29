# Node API Template

All APIs are secuerd by a hardcoded randomly created bearer, stored in the .env file.
The APIs URIs all follow this convention: /api/v1/ where the v represents the version number of the API. The URI is not mentioned again in the Endpoint definitions.

## Prerequisites

This is an example of how to list things you need to use the software and how to install them. Requires at least version 19.1.0
* npm
  ```sh
  npm install

## API Endpoints:

### /test
      returns planet data sourced from swapi
      requires:
        Authorization: Bearer
