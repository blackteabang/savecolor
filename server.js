require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const store = require('./lib/store');

const app = express();
const port = process.env.PORT || 7749;
const ROOT_FAQ_PATH = path.join(__dirname, 'faq.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const COMMENT_MAX_LEN = 80;
const COMMENT_NAME_MAX_LEN = 50;
const FAQ_QUESTION_MAX = 200;
const FAQ_ANSWER_MAX = 2000;
const FAQ_CATEGORY_MAX = 20;

const ADMIN_ID = process.env.ADMIN_ID || 'admin';
const ADMIN_PW = process.env.ADMIN_PW || 'smartsave!';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secret-admin-token-123';

function requireAdmin(req, res) {
    const token = req.headers.authorization;
    if (token !== `Bearer ${ADMIN_TOKEN}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

async function syncRootFaq(items) {
    // GitHub Pages 호환: 루트 faq.json도 함께 유지
    await fs.writeFile(ROOT_FAQ_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function getSignatureCount() {
    const meta = await store.readMeta();
    const signatures = await store.readSignatures();
    return meta.baseSignatures + signatures.length;
}

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/api/admin/login', (req, res) => {
    const { id, password } = req.body || {};
    if (id === ADMIN_ID && password === ADMIN_PW) {
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }
});

app.get('/api/signatures/count', async (req, res) => {
    try {
        const count = await getSignatureCount();
        res.set('Cache-Control', 'no-store');
        res.json({ count });
    } catch (error) {
        console.error('Error fetching signature count:', error);
        res.status(500).json({ error: 'Failed to get signature count' });
    }
});

app.get('/api/signatures', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
        const rows = await store.readSignatures();
        rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.set('Cache-Control', 'no-store');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching signatures:', error);
        res.status(500).json({ error: 'Failed to fetch signatures' });
    }
});

app.delete('/api/signatures/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    try {
        await store.withLock(async () => {
            const rows = await store.readSignatures();
            const next = rows.filter((row) => Number(row.id) !== id);
            if (next.length === rows.length) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }
            await store.writeSignatures(next);
        });
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'Signature not found' });
        console.error('Error deleting signature:', error);
        res.status(500).json({ error: 'Failed to delete signature' });
    }
});

app.post('/api/signatures', async (req, res) => {
    const { name, email, agreed } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        let count = 0;
        await store.withLock(async () => {
            const rows = await store.readSignatures();
            const trimmedEmail = typeof email === 'string' && email.trim() ? email.trim() : null;
            if (trimmedEmail && rows.some((row) => row.email === trimmedEmail)) {
                const err = new Error('DUPLICATE');
                err.code = 'DUPLICATE';
                throw err;
            }
            rows.push({
                id: store.nextId(rows),
                name: name.trim(),
                email: trimmedEmail,
                agreed: agreed === true,
                created_at: new Date().toISOString()
            });
            await store.writeSignatures(rows);
            count = await getSignatureCount();
        });
        res.status(201).json({ message: 'Signature recorded successfully', count });
    } catch (error) {
        if (error.code === 'DUPLICATE') {
            return res.status(409).json({ error: '이미 서명에 참여한 이메일입니다.' });
        }
        console.error('Error saving signature:', error);
        res.status(500).json({ error: 'Failed to save signature' });
    }
});

app.get('/api/faq', async (req, res) => {
    try {
        const items = await store.readFaq();
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
        res.json(await store.readFaq());
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
        let created;
        await store.withLock(async () => {
            const items = await store.readFaq();
            created = {
                id: store.nextId(items),
                category,
                question,
                answer,
                sources: []
            };
            items.push(created);
            await store.writeFaq(items);
            await syncRootFaq(items);
        });
        res.status(201).json(created);
    } catch (error) {
        console.error('Error adding FAQ:', error);
        res.status(500).json({ error: 'Failed to add FAQ' });
    }
});

app.delete('/api/admin/faq/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid FAQ id' });

    try {
        await store.withLock(async () => {
            const items = await store.readFaq();
            const next = items.filter((item) => Number(item.id) !== id);
            if (next.length === items.length) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }
            await store.writeFaq(next);
            await syncRootFaq(next);
        });
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'FAQ not found' });
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ error: 'Failed to delete FAQ' });
    }
});

app.get('/api/comments', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const rows = await store.readComments();
        rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.set('Cache-Control', 'no-store');
        res.json(rows.slice(0, limit));
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', async (req, res) => {
    let { name, message } = req.body || {};
    name = typeof name === 'string' ? name.trim() : '';
    message = typeof message === 'string' ? message.trim().replace(/\s+/g, ' ') : '';

    if (!name) return res.status(400).json({ error: '닉네임을 입력해주세요.' });
    if (!message) return res.status(400).json({ error: '지지 한마디를 입력해주세요.' });
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
        let created;
        await store.withLock(async () => {
            const rows = await store.readComments();
            created = {
                id: store.nextId(rows),
                name,
                message,
                likes: 0,
                created_at: new Date().toISOString()
            };
            rows.push(created);
            await store.writeComments(rows);
        });
        res.status(201).json(created);
    } catch (error) {
        console.error('Error saving comment:', error);
        res.status(500).json({ error: 'Failed to save comment' });
    }
});

app.post('/api/comments/:id/like', async (req, res) => {
    const id = Number(req.params.id);
    try {
        let updated;
        await store.withLock(async () => {
            const rows = await store.readComments();
            const target = rows.find((row) => Number(row.id) === id);
            if (!target) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }
            target.likes = (Number(target.likes) || 0) + 1;
            await store.writeComments(rows);
            updated = { id: target.id, likes: target.likes };
        });
        res.json(updated);
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'Comment not found' });
        console.error('Error liking comment:', error);
        res.status(500).json({ error: 'Failed to like comment' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = Number(req.params.id);
    try {
        await store.withLock(async () => {
            const rows = await store.readComments();
            const next = rows.filter((row) => Number(row.id) !== id);
            if (next.length === rows.length) {
                const err = new Error('NOT_FOUND');
                err.code = 'NOT_FOUND';
                throw err;
            }
            await store.writeComments(next);
        });
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ error: 'Comment not found' });
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

store.ensureDataDir()
    .then(async () => {
        // 루트 faq.json과 data/faq.json 동기화
        const items = await store.readFaq();
        await syncRootFaq(items);
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
            console.log(`JSON store: ${store.DATA_DIR}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize JSON store:', error);
        process.exit(1);
    });
