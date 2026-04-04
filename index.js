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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

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

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name }, 
    { $inc: { seq: 1 } }, 
    { new: true, upsert: true }
  );
  return counter.seq;
}

app.post("/api/shorturl", async (req, res) => {
  const inputUrl = req.body.url;
  
  if (!inputUrl) {
    return res.json({ error: "invalid url" });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(inputUrl);
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
      let urlDoc = await Url.findOne({ original_url: inputUrl });
      
      if (urlDoc) {
        return res.json({ original_url: urlDoc.original_url, short_url: urlDoc.short_url });
      }

      const shortId = await getNextSequence("url_count");
      urlDoc = new Url({
        original_url: inputUrl,
        short_url: shortId
      });
      await urlDoc.save();
      
      res.json({ original_url: urlDoc.original_url, short_url: urlDoc.short_url });
      
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "server error" });
    }
  });
});


app.get('/api/shorturl/:short_url', async function(req, res) {
  try {
    const shortid = parseInt(req.params.short_url);
    
    const urlDoc = await Url.findOne({short_url: shortid});
    
    if (!urlDoc) {
      res.json({ error: 'No short URL found in the database' });
      return;
    }
    
    res.redirect(301, urlDoc.original_url);
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error');
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});