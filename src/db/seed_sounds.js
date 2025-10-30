import fs from 'fs';
import path from 'path';
import pool from './pool.js';

const soundsDir = path.resolve('./src/sounds');

async function seedSounds() {
  const files = fs.readdirSync(soundsDir);

  for (const file of files) {
    const ext = path.extname(file);
    if (!['.wav', '.mp3', '.ogg'].includes(ext)) continue;

    const name = path.basename(file, ext);
    const filePath = `/sounds/${file}`;

    await pool.query(
      `
      INSERT INTO oneshots (name, filepath)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING;
      `,
      [name, filePath]
    );
  }

  console.log('Sounds seeded!');
  process.exit(0);
}

seedSounds().catch(err => {
  console.error('Error seeding sounds:', err);
  process.exit(1);
});