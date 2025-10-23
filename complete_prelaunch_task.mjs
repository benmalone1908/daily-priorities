import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function completePrelaunchTask() {
  console.log('🔧 Marking Oct 8 pre-launch task as completed...\n');
  
  // Mark the Oct 20 instance as completed (the last one before engineering took over)
  const { data, error } = await supabase
    .from('daily_priorities')
    .update({ 
      completed: true,
      completed_at: '2025-10-20T16:35:00.000Z'  // Use the timestamp from when it was completed
    })
    .eq('client_name', 'Catalyst')
    .eq('created_date', '2025-10-08')
    .eq('active_date', '2025-10-20')
    .select();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('✅ Marked Oct 20 pre-launch task as completed');
  console.log('   This prevents it from carrying forward to future dates');
  console.log('');
  
  // Verify - check all Catalyst tasks now
  const { data: allTasks } = await supabase
    .from('daily_priorities')
    .select('created_date, active_date, section, completed, description')
    .eq('client_name', 'Catalyst')
    .gte('active_date', '2025-10-20')
    .order('active_date', { ascending: true });
  
  console.log('Current Catalyst task status (Oct 20+):\n');
  if (allTasks) {
    allTasks.forEach(task => {
      const status = task.completed ? '✓ DONE' : '○ Active';
      console.log(status + ' - ' + task.active_date + ' (created ' + task.created_date + ')');
      console.log('     Section: ' + task.section);
      console.log('     Desc: ' + (task.description?.substring(0, 50) || '(empty)'));
      console.log('');
    });
  }
}

completePrelaunchTask();
