require('dotenv').config();

const express = require('express');
const cors = require('cors');
const dns = require('dns');
const { URL } = require('url');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

const port = process.env.PORT || 3000;

// In-memory storage
const urlDatabase = new Map();
const shortToOriginal = new Map();
let idCounter = 1;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>URL Shortener Microservice</title>
      </head>
      <body>
        <h1>URL Shortener Microservice</h1>
        <form action="/api/shorturl" method="post">
          <label for="url_input">URL:</label>
          <input id="url_input" type="text" name="url" placeholder="https://example.com" />
          <button type="submit">POST URL</button>
        </form>
      </body>
    </html>
  `);
});

function isValidHttpUrl(userInput) {
  try {
    const parsed = new URL(userInput);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  if (!isValidHttpUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    if (urlDatabase.has(originalUrl)) {
      return res.json({
        original_url: originalUrl,
        short_url: urlDatabase.get(originalUrl)
      });
    }

    const shortUrl = idCounter++;
    urlDatabase.set(originalUrl, shortUrl);
    shortToOriginal.set(String(shortUrl), originalUrl);

    return res.json({
      original_url: originalUrl,
      short_url: shortUrl
    });
  });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  const originalUrl = shortToOriginal.get(shortUrl);

  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  return res.redirect(originalUrl);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});