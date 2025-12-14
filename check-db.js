// Check both database files
const Database = require('better-sqlite3');

const files = ['vonix.db', 'data/vonix.db'];

for (const file of files) {
    try {
        const db = new Database(file);
        const columns = db.pragma('table_info(support_tickets)');
        console.log(`\n=== ${file} ===`);
        console.log('Columns:', columns.map(c => c.name));
        db.close();
    } catch (error) {
        console.log(`\n=== ${file} ===`);
        console.log('Error:', error.message);
    }
}
