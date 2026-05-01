const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Get tasks (with optional project filter)
router.get('/', auth, async (req, res) => {
  const { project_id } = req.query;
  let query = 'SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN users u ON u.id=t.assigned_to WHERE 1=1';
  const params = [];
  if (project_id) { params.push(project_id); query += ` AND t.project_id=$${params.length}`; }
  if (req.user.role !== 'admin') { params.push(req.user.id); query += ` AND t.assigned_to=$${params.length}`; }
  res.json((await db.query(query, params)).rows);
});

// Create task
router.post('/', auth, async (req, res) => {
  const { title, description, project_id, assigned_to, due_date, priority } = req.body;
  const result = await db.query(
    'INSERT INTO tasks (title,description,project_id,assigned_to,due_date,priority) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [title, description, project_id, assigned_to, due_date, priority]);
  res.json(result.rows[0]);
});

// Update task status
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  const result = await db.query(
    'UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  res.json(result.rows[0]);
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// Dashboard stats
router.get('/stats', auth, async (req, res) => {
  const uid = req.user.id;
  const stats = await db.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status='todo') as todo,
      COUNT(*) FILTER (WHERE status='in-progress') as in_progress,
      COUNT(*) FILTER (WHERE status='done') as done,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue
    FROM tasks WHERE assigned_to=$1`, [uid]);
  res.json(stats.rows[0]);
});

module.exports = router;