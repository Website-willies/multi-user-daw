import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.PGUSER}${process.env.PGPASSWORD ? `:${process.env.PGPASSWORD}` : ''}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

console.log('connectionString:', JSON.stringify(connectionString));


// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL:", process.env.PGDATABASE);
    client.release();
  })
  .catch((err) => console.error("PostgreSQL connection error:", err.stack));

export default pool;