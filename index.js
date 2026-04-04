const express = require("express");
const cors = require("cors");
const dns = require("dns");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

let urls = [];
let counter = 1;

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));

app.post("/api/shorturl", (req, res) => {
  const url = req.body.url;
  
  dns.lookup(url.replace(/^(https?:\/\/)/, '').split('/')[0], (err) => {
    if (err) return res.json({ error: "invalid url" });
    
    const existing = urls.find(u => u.original_url === url);
    if (existing) {
      return res.json(existing);
    }
    
    const shortUrl = counter++;
    urls.push({ original_url: url, short_url: shortUrl });
    res.json({ original_url: url, short_url: shortUrl });
  });
});

app.get("/api/shorturl/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const url = urls.find(u => u.short_url === id);
  if (!url) return res.json({ error: "No short URL found" });
  res.redirect(301, url.original_url);
});

app.listen(3000, () => console.log("http://localhost:3000"));