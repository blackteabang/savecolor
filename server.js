require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 7749;
const FAQ_PATH = path.join(__dirname, 'faq.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname))); // Serve index.html and static files

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dareum',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const COMMENT_MAX_LEN = 80;
const COMMENT_NAME_MAX_LEN = 50;
const FAQ_QUESTION_MAX = 200;
const FAQ_ANSWER_MAX = 2000;
const FAQ_CATEGORY_MAX = 20;

// Admin Authentication Constants
const ADMIN_ID = 'admin';
const ADMIN_PW = 'smartsave!';
const ADMIN_TOKEN = 'secret-admin-token-123';
const BASE_SIGNATURES = 8421;

async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            message VARCHAR(80) NOT NULL,
            likes INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    try {
        await pool.query('ALTER TABLE support_comments ADD COLUMN likes INT NOT NULL DEFAULT 0');
    } catch (error) {
        // Ignore duplicate column errors on existing installs
        if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
}

async function readFaq() {
    try {
        const raw = await fs.readFile(FAQ_PATH, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function writeFaq(items) {
    await fs.writeFile(FAQ_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

function requireAdmin(req, res) {
    const token = req.headers.authorization;
    if (token !== `Bearer ${ADMIN_TOKEN}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

app.get('/api/signatures/count', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM signatures');
        const count = BASE_SIGNATURES + (rows[0].count || 0);
        res.json({ count });
    } catch (error) {
        console.error('Error fetching signature count:', error);
        res.status(500).json({ error: 'Failed to get signature count' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/api/admin/login', (req, res) => {
    const { id, password } = req.body;
    if (id === ADMIN_ID && password === ADMIN_PW) {
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }
});

app.get('/api/signatures', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
        const [rows] = await pool.query('SELECT id, name, email, created_at FROM signatures ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ error: 'Failed to fetch signatures' });
    }
});

app.delete('/api/signatures/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
        const [result] = await pool.query('DELETE FROM signatures WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Signature not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting signature:', error);
        res.status(500).json({ error: 'Failed to delete signature' });
    }
});

app.post('/api/signatures', async (req, res) => {
    const { name, email, agreed } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        if (email) {
            const [existing] = await pool.query('SELECT id FROM signatures WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ error: '이미 서명에 참여한 이메일입니다.' });
            }
        }

        await pool.query(
            'INSERT INTO signatures (name, email, agreed) VALUES (?, ?, ?)',
            [name, email || null, agreed === true]
        );

        const [rows] = await pool.query('SELECT COUNT(*) as count FROM signatures');
        const count = BASE_SIGNATURES + (rows[0].count || 0);

        res.status(201).json({
            message: 'Signature recorded successfully',
            count
        });
    } catch (error) {
        console.error('Error saving signature:', error);
        res.status(500).json({ error: 'Failed to save signature' });
    }
});

app.get('/api/faq', async (req, res) => {
    try {
        const items = await readFaq();
        res.set('Cache-Control', 'no-store');
        res.json(items);
    } catch (error) {
        console.error('Error reading FAQ:', error);
        res.status(500).json({ error: 'Failed to load FAQ' });
    }
});

app.get('/api/admin/faq', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const items = await readFaq();
        res.json(items);
    } catch (error) {
        console.error('Error reading FAQ:', error);
        res.status(500).json({ error: 'Failed to load FAQ' });
    }
});

app.post('/api/admin/faq', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    let { category, question, answer } = req.body || {};
    category = typeof category === 'string' ? category.trim() : '';
    question = typeof question === 'string' ? question.trim() : '';
    answer = typeof answer === 'string' ? answer.trim() : '';

    if (!category) return res.status(400).json({ error: '카테고리를 입력해주세요.' });
    if (!question) return res.status(400).json({ error: '질문을 입력해주세요.' });
    if (!answer) return res.status(400).json({ error: '답변을 입력해주세요.' });
    if (category.length > FAQ_CATEGORY_MAX) {
        return res.status(400).json({ error: `카테고리는 ${FAQ_CATEGORY_MAX}자 이내로 입력해주세요.` });
    }
    if (question.length > FAQ_QUESTION_MAX) {
        return res.status(400).json({ error: `질문은 ${FAQ_QUESTION_MAX}자 이내로 입력해주세요.` });
    }
    if (answer.length > FAQ_ANSWER_MAX) {
        return res.status(400).json({ error: `답변은 ${FAQ_ANSWER_MAX}자 이내로 입력해주세요.` });
    }

    try {
        const items = await readFaq();
        const nextId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
        const created = {
            id: nextId,
            category,
            question,
            answer,
            sources: []
        };
        items.push(created);
        await writeFaq(items);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error adding FAQ:', error);
        res.status(500).json({ error: 'Failed to add FAQ' });
    }
});

app.delete('/api/admin/faq/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid FAQ id' });
    }

    try {
        const items = await readFaq();
        const next = items.filter((item) => Number(item.id) !== id);
        if (next.length === items.length) {
            return res.status(404).json({ error: 'FAQ not found' });
        }
        await writeFaq(next);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ error: 'Failed to delete FAQ' });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const [rows] = await pool.query(
            'SELECT id, name, message, likes, created_at FROM support_comments ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', async (req, res) => {
    let { name, message } = req.body || {};
    name = typeof name === 'string' ? name.trim() : '';
    message = typeof message === 'string' ? message.trim().replace(/\s+/g, ' ') : '';

    if (!name) {
        return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    }
    if (!message) {
        return res.status(400).json({ error: '지지 한마디를 입력해주세요.' });
    }
    if (name.length > COMMENT_NAME_MAX_LEN) {
        return res.status(400).json({ error: `닉네임은 ${COMMENT_NAME_MAX_LEN}자 이내로 입력해주세요.` });
    }
    if (message.length > COMMENT_MAX_LEN) {
        return res.status(400).json({ error: `지지 한마디는 ${COMMENT_MAX_LEN}자 이내로 입력해주세요.` });
    }
    if (message.includes('\n') || message.includes('\r')) {
        return res.status(400).json({ error: '한 줄로만 작성해주세요.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO support_comments (name, message) VALUES (?, ?)',
            [name, message]
        );
        res.status(201).json({
            id: result.insertId,
            name,
            message,
            likes: 0,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving comment:', error);
        res.status(500).json({ error: 'Failed to save comment' });
    }
});

app.post('/api/comments/:id/like', async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE support_comments SET likes = likes + 1 WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        const [rows] = await pool.query(
            'SELECT id, likes FROM support_comments WHERE id = ?',
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('Error liking comment:', error);
        res.status(500).json({ error: 'Failed to like comment' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    try {
        const [result] = await pool.query('DELETE FROM support_comments WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

ensureSchema()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to ensure database schema:', error);
        process.exit(1);
    });
