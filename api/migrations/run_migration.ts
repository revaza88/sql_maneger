import { pool } from '../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Running isPaused column migration...');
    
    const migrationPath = path.join(__dirname, 'add_isPaused_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.request().query(migrationSQL);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
