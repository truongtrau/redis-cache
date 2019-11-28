// Import the installed modules.
const express = require('express');
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');

const app = express();

// create and connect redis client to local instance.
const client = redis.createClient();

// use response-time as a middleware
app.use(responseTime({
    host:  "127.0.0.1",
    port:  6379,
    db:  0,
}));

// create an api/search route
app.get('/api/search', (req, res) => {
  // Extract the query from url and trim trailing spaces
  const query = (req.query.query).trim();
  // Build the Wikipedia API url
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
  // Try fetching the result from Redis first in case we have it cached
  return client.get(`wikipedia:${query}`, (err, result) => {
    // If that key exist in Redis store
    if (result) {
        console.log('load redis')
      const resultJSON = JSON.parse(result);
      return res.status(200).json(resultJSON);
    } else { // Key does not exist in Redis store
      // Fetch directly from Wikipedia API
      console.log('GEt Database')
      return axios.get(searchUrl)
        .then(response => {
          const responseJSON = response.data;
          // Save the Wikipedia API response in Redis store
          client.setex(`wikipedia:${query}`, 10, JSON.stringify({ source: 'Redis Cache', ...responseJSON, }));
          // Send JSON response to client
          return res.status(200).json({ source: 'Wikipedia API', ...responseJSON, });
        })
        .catch(err => {
          return res.json(err);
        });
    }
  });
});

app.listen(3000, () => {
  console.log('Server listening on port: ', 3000);
});