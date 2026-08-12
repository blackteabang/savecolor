const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const FILES = {
    meta: path.join(DATA_DIR, 'meta.json'),
    signatures: path.join(DATA_DIR, 'signatures.json'),
    comments: path.join(DATA_DIR, 'comments.json'),
    faq: path.join(DATA_DIR, 'faq.json')
};

const DEFAULTS = {
    meta: { baseSignatures: 8421, updatedAt: null },
    signatures: [],
    comments: [],
    faq: []
};

let writeChain = Promise.resolve();

function withLock(fn) {
    const run = writeChain.then(fn, fn);
    writeChain = run.then(() => undefined, () => undefined);
    return run;
}

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    for (const [key, filePath] of Object.entries(FILES)) {
        try {
            await fs.access(filePath);
        } catch {
            const value = DEFAULTS[key];
            const payload = key === 'meta'
                ? { ...value, updatedAt: new Date().toISOString() }
                : value;
            await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
        }
    }
}

async function readJson(filePath, fallback) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error.code === 'ENOENT') return typeof fallback === 'function' ? fallback() : fallback;
        throw error;
    }
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function readMeta() {
    const meta = await readJson(FILES.meta, { ...DEFAULTS.meta });
    return {
        baseSignatures: Number(meta.baseSignatures) || DEFAULTS.meta.baseSignatures,
        updatedAt: meta.updatedAt || null
    };
}

async function touchMeta(extra = {}) {
    const meta = await readMeta();
    const next = {
        ...meta,
        ...extra,
        updatedAt: new Date().toISOString()
    };
    await writeJson(FILES.meta, next);
    return next;
}

async function readSignatures() {
    const rows = await readJson(FILES.signatures, []);
    return Array.isArray(rows) ? rows : [];
}

async function writeSignatures(rows) {
    await writeJson(FILES.signatures, rows);
    await touchMeta();
}

async function readComments() {
    const rows = await readJson(FILES.comments, []);
    return Array.isArray(rows) ? rows : [];
}

async function writeComments(rows) {
    await writeJson(FILES.comments, rows);
    await touchMeta();
}

async function readFaq() {
    const rows = await readJson(FILES.faq, []);
    return Array.isArray(rows) ? rows : [];
}

async function writeFaq(rows) {
    await writeJson(FILES.faq, rows);
    await touchMeta();
}

function nextId(rows) {
    return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

module.exports = {
    DATA_DIR,
    FILES,
    ensureDataDir,
    withLock,
    readMeta,
    touchMeta,
    readSignatures,
    writeSignatures,
    readComments,
    writeComments,
    readFaq,
    writeFaq,
    nextId
};
