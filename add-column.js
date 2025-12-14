// Temporary script to add missing discord_thread_id column
const Database = require('better-sqlite3');

const db = new Database('data/vonix.db');

try {
    // Check if column exists
    const columns = db.pragma('table_info(support_tickets)');
    console.log('Current columns:', columns.map(c => c.name));

    const hasColumn = columns.some(col => col.name === 'discord_thread_id');

    if (!hasColumn) {
        console.log('Adding discord_thread_id column to support_tickets table...');
        db.exec('ALTER TABLE support_tickets ADD COLUMN discord_thread_id TEXT');
        console.log('Column added successfully!');
    } else {
        console.log('Column already exists.');
    }
} catch (error) {
    console.error('Error:', error);
} finally {
    db.close();
}
