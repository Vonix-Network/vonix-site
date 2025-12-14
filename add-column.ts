// Temporary script to add missing discord_thread_id column
import Database from 'better-sqlite3';

const db = new Database('vonix.db');

try {
    // Check if column exists
    const columns = db.pragma('table_info(support_tickets)');
    const hasColumn = columns.some((col: { name: string }) => col.name === 'discord_thread_id');

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
