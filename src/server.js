import express from "express";
import pool from "./db/pool.js";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import soundRoutes from "./routes/sounds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let app = express();

let hostname = "localhost";
let port = 3000;

app.use(express.json());
app.use(express.static("src/public"));

app.use("/sounds", express.static("server/sounds"));
app.use("/sounds", soundRoutes);

app.get("/assign", (req, res) => {
  res.status(200).json({ "uuid": crypto.randomUUID() })
});

app.use("/track", express.static(path.join(__dirname, "private")));
app.get("/track",  (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '/private/track.html')); 
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
