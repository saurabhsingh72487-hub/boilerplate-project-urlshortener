const express = require("express");
const cors = require("cors");
const dns = require("dns");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/public", express.static(path.join(process.cwd(), "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(process.cwd(), "views", "index.html"));
});

const urls = [];
let counter = 1;

app.post("/api/shorturl", function(req, res) {
  const originalUrl = req.body.url;
  
  try {
    new URL(originalUrl);
  } catch {
    return res.json({ error: "invalid url" });
  }

  const hostname = originalUrl.replace(/^https?:\/\//, '').split('/')[0];
  
  dns.lookup(hostname, function(err) {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    const existing = urls.find(u => u.original_url === originalUrl);
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    const shortId = counter++;
    urls.push({
      original_url: originalUrl,
      short_url: shortId
    });
    
    res.json({
      original_url: originalUrl,
      short_url: shortId
    });
  });
});

app.get("/api/shorturl/:short_url", function(req, res) {
  const id = parseInt(req.params.short_url);
  const urlData = urls.find(u => u.short_url === id);
  
  if (!urlData) {
    return res.json({ error: "No short URL found in the database" });
  }
  
  res.redirect(301, urlData.original_url);
});

app.listen(port, function () {
  console.log("Listening on port " + port);
});