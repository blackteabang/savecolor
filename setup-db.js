require('dotenv').config();
const store = require('./lib/store');

async function setup() {
    try {
        console.log('Initializing JSON data store...');
        await store.ensureDataDir();
        const meta = await store.readMeta();
        const signatures = await store.readSignatures();
        const comments = await store.readComments();
        const faq = await store.readFaq();
        console.log(`data/meta.json         baseSignatures=${meta.baseSignatures}`);
        console.log(`data/signatures.json   ${signatures.length} rows`);
        console.log(`data/comments.json     ${comments.length} rows`);
        console.log(`data/faq.json          ${faq.length} rows`);
        console.log('JSON store setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to setup JSON store:', error.message);
        process.exit(1);
    }
}

setup();
