import { Router } from 'express';
import pool from '../db/pool.js';

export default function soundRoutes(wss){
  const router = Router();

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
    const { uuid, sound, pitch, time, pitch_count } = req.body;
    try {
      const result = await pool.query(
        'UPDATE sounds SET uuid = $1, sound = $2, pitch = $3, time = $4, pitch_count = $5, WHERE id = $6 RETURNING *;',
        [uuid, sound, pitch, time, pitch_count, id]
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
    const { uuid, sound, pitch, time, pitch_count} = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO sounds (uuid, sound, pitch, time, pitch_count) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
        [uuid, sound, pitch, time, pitch_count]
      );
      wss.broadcast({type: 'note-added', uuid: uuid, payload: result.rows[0]})
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

  // GET many by UUID
  router.get('/track/:uuid', async (req, res) => {
    const { uuid } = req.params;
    try {
        const result = await pool.query('SELECT * FROM sounds WHERE uuid = $1;',
          [uuid]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
        let tracks = {}
        for (const row of result.rows){
          if (!tracks.hasOwnProperty(row['sound'])) tracks[row['sound']] = {'pitch_count': row['pitch_count'], 'notes': []}
          tracks[row['sound']].notes.push({'pitch': row['pitch'], 'time': row['time']})
        }
        res.json(tracks);
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
        const base = i * 5;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        params.push(uuid, s.sound, s.pitch, s.time, s.pitch_count);
      });

      const query = `
        INSERT INTO sounds (uuid, sound, pitch, time, pitch_count)
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
    const { sound, pitch, time } = req.body || {};
    let result;
    try {
      if (!sound && !pitch && !time){
        result = await pool.query('DELETE FROM sounds WHERE uuid = $1 RETURNING *;', [uuid]);
        wss.broadcast({ type: "track-deleted", uuid: uuid, payload: result.rows });
      }else {
        result = await pool.query('DELETE FROM sounds WHERE uuid = $1 AND sound = $2 AND pitch = $3 AND time = $4 RETURNING *;', [uuid, sound, pitch, time]);
        wss.broadcast({ type: "sounds-deleted",uuid: uuid, payload: result.rows });
      }
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(200).json({ message: 'Deleted', deleted: result.rows });
    } catch (err) {
      console.error('Error deleting sounds:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  router.delete('/track/:uuid/:sound', async (req, res) => {
    const { uuid, sound } = req.params;
    const { deleteType } = req.body;
    try {
      const result = await pool.query('DELETE FROM sounds WHERE uuid = $1 AND sound = $2 RETURNING *;', [uuid, sound]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      wss.broadcast({ type: "instrument-deleted", deleteType: deleteType, uuid: uuid, payload: sound });
      res.status(200).json({ message: 'Deleted', deleted: result.rows });
    } catch (err) {
      console.error('Error deleting sounds:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  })

  return router;
}