#!/usr/bin/env node

/**
 * Apply migration to production Supabase database
 * This adds the unique constraint to prevent carry-forward duplicates
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://kxggewdlaujmjyamfcik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Read the migration SQL
const migrationSQL = readFileSync(
  './supabase/migrations/20251023000000_add_task_identity_constraint.sql',
  'utf-8'
);

console.log('🔧 Applying migration to production Supabase...');
console.log('Migration SQL:');
console.log(migrationSQL);
console.log('\n⚠️  WARNING: This will modify the production database!');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(async () => {
  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Response:', data);

  } catch (err) {
    console.error('❌ Error applying migration:', err);
    process.exit(1);
  }
}, 3000);
