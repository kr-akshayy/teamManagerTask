const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Get all projects for user
router.get('/', auth, async (req, res) => {
  const result = await db.query(`
    SELECT p.* FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE p.owner_id = $1 OR pm.user_id = $1`, [req.user.id]);
  res.json(result.rows);
});

// Create project (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admins only' });
  const { name, description } = req.body;
  const result = await db.query(
    'INSERT INTO projects (name,description,owner_id) VALUES ($1,$2,$3) RETURNING *',
    [name, description, req.user.id]);
  res.json(result.rows[0]);
});

// Add member to project
router.post('/:id/members', auth, async (req, res) => {
  await db.query('INSERT INTO project_members VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.params.id, req.body.user_id]);
  res.json({ success: true });
});

module.exports = router;