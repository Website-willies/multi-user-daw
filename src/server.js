import express from "express";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import http from 'http';

import { createWebSocketServer } from "./routes/ws.js";
import soundRoutes from "./routes/sounds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oneshotsPath = path.join(__dirname, "oneshots");

let app = express();
let server = http.createServer(app);
let wss = createWebSocketServer(server);
let hostname = "0.0.0.0";
let port = 3000;

app.use(express.json());
app.use(express.static("src/public"));

app.use("/sounds", soundRoutes(wss));
app.use("/oneshots", express.static(oneshotsPath));

app.get("/assign", (req, res) => {
  res.status(200).json({ "uuid": crypto.randomUUID() })
});

app.get("/list-oneshots", (req, res) => {
  try {
    const instruments = fs.readdirSync(oneshotsPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(dir => {
        const instrumentName = dir.name;
        const files = fs.readdirSync(path.join(oneshotsPath, instrumentName))
          .filter(f => f.endsWith(".wav"))
          .map(f => f.replace(/\.wav$/i, ""));
        return { instrument: instrumentName, files };
      });

    res.json(instruments);
  } catch (err) {
    console.error("Error reading oneshots:", err);
    res.status(500).json({ error: "Failed to read oneshots" });
  }
});

app.get('/oneshot-paths', (req, res) => {
  try {
    const urls = fs.readdirSync(oneshotsPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .flatMap(dir => {
        const instrumentFolder = dir.name;
        const files = fs.readdirSync(path.join(oneshotsPath, instrumentFolder))
          .filter(f => f.endsWith(".wav"))
          .map(f => `/oneshots/${instrumentFolder}/${f}`);
        return files;
      });

    res.json(urls);

  } catch (err) {
    console.error("Error reading oneshots:", err);
    res.status(500).json({ error: "Failed to read oneshots" });
  }
})

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
