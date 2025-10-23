import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCatalystSection() {
  console.log('🔧 Updating Catalyst task to engineering section...\n');
  
  // According to the activity log, Hannah moved it to engineering on Oct 21
  // So update all future instances (Oct 21 onwards) to engineering
  
  const { error, count } = await supabase
    .from('daily_priorities')
    .update({ section: 'engineering', priority_order: 1 })
    .eq('client_name', 'Catalyst')
    .eq('created_date', '2025-10-08')
    .gte('active_date', '2025-10-21');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('✅ Updated ' + count + ' task instances to engineering section');
  console.log('');
  
  // Verify
  const { data: tasks } = await supabase
    .from('daily_priorities')
    .select('*')
    .eq('client_name', 'Catalyst')
    .order('active_date', { ascending: true });
  
  console.log('Current Catalyst task status:');
  if (tasks) {
    tasks.forEach(task => {
      console.log('  ' + task.active_date + ' - Section: ' + task.section + ' - Priority: ' + task.priority_order);
    });
  }
}

updateCatalystSection();
