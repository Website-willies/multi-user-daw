import fs from 'fs';
import path from 'path';
import pool from './pool.js';

const oneshotsDir = path.resolve('./src/oneshots');

async function seedOneshots() {
  const files = fs.readdirSync(oneshotsDir);

  for (const file of files) {
    const ext = path.extname(file);
    if (!['.wav', '.mp3', '.ogg'].includes(ext)) continue;

    const name = path.basename(file, ext);
    const filePath = `/oneshots/${file}`;

    await pool.query(
      `
      INSERT INTO oneshots (name, filepath)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING;
      `,
      [name, filePath]
    );
  }

  console.log('Oneshots seeded!');
  process.exit(0);
}

seedOneshots().catch(err => {
  console.error('Error seeding oneshots:', err);
  process.exit(1);
});