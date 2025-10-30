import express from "express";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import soundRoutes from "./routes/sounds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
