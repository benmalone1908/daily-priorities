import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Applying migration manually via RPC calls...\n');
  
  // Step 1: Check if column already exists
  const { data: sampleRow } = await supabase
    .from('daily_priorities')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleRow && 'issue_title' in sampleRow) {
    console.log('✅ Column issue_title already exists!');
    return;
  }
  
  console.log('⚠️  Column does not exist yet.');
  console.log('');
  console.log('To apply the migration, you have two options:\n');
  console.log('Option 1: Use Supabase Dashboard');
  console.log('  1. Go to: https://supabase.com/dashboard/project/kxggewdlaujmjyamfcik/sql');
  console.log('  2. Copy and paste the SQL from: supabase/migrations/20251022000000_add_issue_title.sql');
  console.log('  3. Click "Run"\n');
  console.log('Option 2: Use Supabase CLI (if logged in)');
  console.log('  cd "/Users/benmalone/Claude Projects/daily-priorities"');
  console.log('  supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.kxggewdlaujmjyamfcik.supabase.co:5432/postgres"');
  console.log('');
  console.log('I recommend Option 1 (Dashboard) as it\'s simpler.');
}

applyMigration();
