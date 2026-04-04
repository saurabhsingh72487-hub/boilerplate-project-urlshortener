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
app.use("/public", express.static(path.join(process.cwd(), "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(process.cwd(), "views", "index.html"));
});

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});

const Counter = mongoose.model("Counter", counterSchema);
const Url = mongoose.model("Url", urlSchema);

async function getNextSequence() {
 const counter = await Counter.findOneAndUpdate(
  { _id: "url_seq" },
  { $inc: { seq: 1 } },
  { returnDocument: "after", upsert: true }
);
  return counter.seq;
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

      const shortUrl = await getNextSequence();

      const newUrl = await Url.create({
        original_url: originalUrl,
        short_url: shortUrl
      });

      return res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });
    } catch (err) {
      console.error(err);
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});