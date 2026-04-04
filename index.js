const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns");
const { URL } = require("url");
const path = require("path");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// In-memory storage for URLs
const urlDatabase = [];
let counter = 1;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Home page
app.get("/", function (req, res) {
  res.sendFile(path.join(process.cwd(), "views", "index.html"));
});

// POST /api/shorturl
app.post("/api/shorturl", (req, res) => {
  const originalUrl = req.body.url;

  if (!originalUrl) {
    return res.json({ error: "invalid url" });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(originalUrl);
  } catch (err) {
    return res.json({ error: "invalid url" });
  }

  // Only allow http and https
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return res.json({ error: "invalid url" });
  }

  const hostname = parsedUrl.hostname;

  dns.lookup(hostname, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    // Check if already stored
    const existing = urlDatabase.find((item) => item.original_url === originalUrl);
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    const newEntry = {
      original_url: originalUrl,
      short_url: counter++
    };

    urlDatabase.push(newEntry);

    return res.json({
      original_url: newEntry.original_url,
      short_url: newEntry.short_url
    });
  });
});

// GET /api/shorturl/:short_url
app.get("/api/shorturl/:short_url", (req, res) => {
  const shortUrl = parseInt(req.params.short_url, 10);

  const record = urlDatabase.find((item) => item.short_url === shortUrl);

  if (!record) {
    return res.json({ error: "No short URL found for the given input" });
  }

  res.redirect(record.original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});