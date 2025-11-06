import express from "express";
import fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';
import soundRoutes from "./routes/sounds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oneshotsPath = path.join(__dirname, "oneshots");

let app = express();
let hostname = "localhost";
let port = 3000;

app.use(express.json());
app.use(express.static("src/public"));

app.use("/sounds", soundRoutes);
app.use("/oneshots", express.static(oneshotsPath));

app.get("/assign", (req, res) => {
  res.status(200).json({ "uuid": crypto.randomUUID() })
});

app.get('/list-oneshots', (req, res) => {
  let oneshot_names = [];
  fs.readdir(oneshotsPath, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    for (let file of files){
      oneshot_names.push(path.parse(file).name)
    }
    res.json(oneshot_names);
  });
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
