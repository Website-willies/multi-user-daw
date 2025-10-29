import express from "express";
import pool from "./db/pool.js";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let app = express();

let hostname = "localhost";
let port = 3000;



app.use(express.json());
app.use(express.static("public"));

app.use("/sounds", express.static("server/sounds"));

app.get("/sounds", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sounds ORDER BY id;");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sounds:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/assign", (req, res) => {

  res.status(200);
  res.contentType('application/json');
  let id = crypto.randomUUID()
  res.json({ "uuid": id });

});

app.use("/track", express.static(path.join(__dirname, "private")));

app.get("/track",  (req, res) => {
  res.status(200);
  res.sendFile(path.join(__dirname, '/private/track.html')); 
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
