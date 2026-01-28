#!/usr/bin/env node

/**
 * Apply renewal_status_tracking migration to production Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://kxggewdlaujmjyamfcik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Read the migration SQL
const migrationPath = join(__dirname, 'supabase/migrations/20260124000000_create_renewal_status_tracking.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🔧 Applying renewal_status_tracking migration to production Supabase...');
console.log('\nMigration SQL:');
console.log('─'.repeat(60));
console.log(migrationSQL);
console.log('─'.repeat(60));
console.log('\n⚠️  WARNING: This will modify the production database!');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(async () => {
  try {
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('renewal_status_tracking')
      .select('id')
      .limit(1);

    if (!checkError && existingTable !== null) {
      console.log('✅ Table renewal_status_tracking already exists!');
      console.log('Migration may have already been applied.');
      process.exit(0);
    }

    // Try to execute via RPC if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If RPC doesn't exist, provide manual instructions
      if (error.code === '42883' || error.message?.includes('function exec_sql')) {
        console.log('\n❌ Cannot execute SQL directly via anon key (security restriction).');
        console.log('\n📋 Please apply this migration manually:\n');
        console.log('Option 1: Supabase Dashboard (Recommended)');
        console.log('  1. Go to: https://supabase.com/dashboard/project/kxggewdlaujmjyamfcik/sql/new');
        console.log('  2. Copy and paste the SQL shown above');
        console.log('  3. Click "Run" to execute\n');
        console.log('Option 2: Supabase CLI');
        console.log('  supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.kxggewdlaujmjyamfcik.supabase.co:5432/postgres"');
        console.log('\nI recommend Option 1 (Dashboard) as it\'s simpler and safer.');
        process.exit(1);
      } else {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      }
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Response:', data);
    }

  } catch (err) {
    console.error('❌ Error applying migration:', err);
    console.log('\n📋 Please apply this migration manually via Supabase Dashboard:');
    console.log('  https://supabase.com/dashboard/project/kxggewdlaujmjyamfcik/sql/new');
    process.exit(1);
  }
}, 3000);
