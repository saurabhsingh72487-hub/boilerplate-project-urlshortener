require("dotenv").config();

const express = require("express");
const cors = require("cors");
const dns = require("dns");
const path = require("path");
const mongoose = require("mongoose");
const { URL } = require("url");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(path.join(process.cwd(), "views", "index.html"));
});

mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});

const Url = mongoose.model("Url", urlSchema);

async function getNextShortUrl() {
  const lastEntry = await Url.findOne().sort({ short_url: -1 });
  return lastEntry ? lastEntry.short_url + 1 : 1;
}

app.post("/api/shorturl", async (req, res) => {
  const originalUrl = req.body.url;

  if (!originalUrl) {
    return res.json({ error: "invalid url" });
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    return res.json({ error: "invalid url" });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(parsedUrl.hostname, async (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    try {
      const existing = await Url.findOne({ original_url: originalUrl });

      if (existing) {
        return res.json({
          original_url: existing.original_url,
          short_url: existing.short_url
        });
      }

      const nextShortUrl = await getNextShortUrl();

      const newUrl = new Url({
        original_url: originalUrl,
        short_url: nextShortUrl
      });

      await newUrl.save();

      return res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    } catch {
      return res.status(500).json({ error: "server error" });
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shortUrl = parseInt(req.params.short_url, 10);

  if (isNaN(shortUrl)) {
    return res.json({ error: "No short URL found for the given input" });
  }

  try {
    const foundUrl = await Url.findOne({ short_url: shortUrl });

    if (!foundUrl) {
      return res.json({ error: "No short URL found for the given input" });
    }

    return res.redirect(foundUrl.original_url);
  } catch {
    return res.status(500).json({ error: "server error" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});