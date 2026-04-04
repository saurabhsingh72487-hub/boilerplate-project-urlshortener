const express = require("express");
const cors = require("cors");
const dns = require("dns");
const { URL } = require("url");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use("/public", express.static(path.join(process.cwd(), "public")));

const urlDatabase = [];
let counter = 1;

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "views", "index.html"));
});

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

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    const existing = urlDatabase.find(
      (item) => item.original_url === originalUrl
    );

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

app.get("/api/shorturl/:short_url", (req, res) => {
  const shortUrl = Number(req.params.short_url);

  const entry = urlDatabase.find(e => e.short_url === shortUrl);

  if (!entry) {
    return res.json({ error: "No short URL found for the given input" });
  }

  res.status(302);
  res.set("Location", entry.original_url);
  return res.end();
});
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});