import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateCreation() {
  console.log('🔍 Investigating how Catalyst task was created...\n');
  
  // Check activity log for 'created' actions
  const { data: createdLogs } = await supabase
    .from('activity_log')
    .select('*')
    .ilike('task_description', '%Catalyst%')
    .eq('action', 'created')
    .order('created_at', { ascending: true });
  
  if (createdLogs && createdLogs.length > 0) {
    console.log('Found ' + createdLogs.length + ' creation events:\n');
    createdLogs.forEach(log => {
      const date = new Date(log.created_at);
      console.log('📝 Created: ' + date.toLocaleString());
      console.log('   User: ' + log.user_id);
      console.log('   Task: ' + log.task_description);
      console.log('   Priority ID: ' + log.priority_id);
      console.log('');
    });
  } else {
    console.log('❌ No creation logs found (might have been created before logging was added)\n');
  }
  
  // Check when activity logging was added
  const { data: oldestLog } = await supabase
    .from('activity_log')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);
  
  if (oldestLog && oldestLog.length > 0) {
    console.log('Oldest activity log entry: ' + new Date(oldestLog[0].created_at).toLocaleString());
    console.log('(Activity logging started on this date)\n');
  }
  
  // Check the actual created_at timestamps of the tasks
  console.log('Checking actual task creation timestamps:\n');
  
  const { data: allCatalyst } = await supabase
    .from('daily_priorities')
    .select('created_date, active_date, created_at, section, description')
    .eq('client_name', 'Catalyst')
    .order('created_at', { ascending: true });
  
  if (allCatalyst && allCatalyst.length > 0) {
    const grouped = {};
    allCatalyst.forEach(task => {
      if (!grouped[task.created_date]) {
        grouped[task.created_date] = [];
      }
      grouped[task.created_date].push(task);
    });
    
    console.log('Tasks grouped by created_date:\n');
    Object.keys(grouped).sort().forEach(createdDate => {
      const tasks = grouped[createdDate];
      const firstTask = tasks[0];
      console.log('📅 created_date = ' + createdDate);
      console.log('   First instance created_at: ' + new Date(firstTask.created_at).toLocaleString());
      console.log('   Total instances: ' + tasks.length);
      console.log('   Dates: ' + tasks.map(t => t.active_date).join(', '));
      console.log('');
    });
  }
}

investigateCreation();
