import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// GET many by UUID
router.get('/track/:uuid', async (req, res) => {
    const { uuid } = req.params;
    try {
        const result = await pool.query('SELECT * FROM sounds WHERE uuid = $1;',
          [uuid]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching sounds:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// POST many by UUID
router.post('/track/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const sounds = req.body;

  try {
    const values = [];
    const params = [];

    sounds.forEach((s, i) => {
      const base = i * 4;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      params.push(uuid, s.sound, s.pitch, s.time);
    });

    const query = `
      INSERT INTO sounds (uuid, sound, pitch, time)
      VALUES ${values.join(', ')}
      RETURNING *;
    `;

    const result = await pool.query(query, params);
    res.status(200).json({ inserted: result.rows });
  } catch (err) {
    console.error('Error inserting sounds:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// DELETE many by UUID
router.delete('/track/:uuid', async (req, res) => {
  const { uuid } = req.params;
  try {
    const result = await pool.query('DELETE FROM sounds WHERE uuid = $1 RETURNING *;', [uuid]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Deleted', deleted: result.rows });
  } catch (err) {
    console.error('Error deleting sounds:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET all
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sounds ORDER BY id;');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sounds:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET one
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM sounds WHERE id = $1;', 
          [id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching sound:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

// PUT one
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { uuid, sound, pitch, time } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sounds SET uuid = $1, sound = $2, pitch = $3, time = $4 WHERE id = $5 RETURNING *;',
      [uuid, sound, pitch, time, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating sound:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST one
router.post('/', async (req, res) => {
  const { uuid, sound, pitch, time } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sounds (uuid, sound, pitch, time) VALUES ($1, $2, $3, $4) RETURNING *;',
      [uuid, sound, pitch, time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting sound:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE one
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM sounds WHERE id = $1 RETURNING *;', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting sound:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
