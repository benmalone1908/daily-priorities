import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreCatalystEngineering() {
  console.log('🔧 Restoring Catalyst engineering task (Oct 14 onwards)...\n');
  
  // The engineering task should exist from Oct 14 onwards
  // Based on activity log, it was in engineering section from Oct 21
  // Let's create it for today (Oct 22) and tomorrow (Oct 23) with the latest details
  
  const tasksToCreate = [
    {
      active_date: '2025-10-22',
      created_date: '2025-10-14',
      section: 'engineering',
      priority_order: 1,
      agency_name: null,
      client_name: 'Catalyst',
      ticket_url: 'https://mediajel.io/tasks/details/cmga26v1ubltm0b00tw712hrj',
      description: 'client placed 10/21, requesting feedback from Sean ',
      assignees: ['Sean'],
      completed: false,
      created_by: 'user-hannah'
    },
    {
      active_date: '2025-10-23',
      created_date: '2025-10-14',
      section: 'engineering',
      priority_order: 1,
      agency_name: null,
      client_name: 'Catalyst',
      ticket_url: 'https://mediajel.io/tasks/details/cmga26v1ubltm0b00tw712hrj',
      description: 'client placed 10/21, requesting feedback from Sean ',
      assignees: ['Sean'],
      completed: false,
      created_by: 'user-hannah'
    }
  ];
  
  // Check if tasks already exist for these dates
  for (const task of tasksToCreate) {
    const { data: existing } = await supabase
      .from('daily_priorities')
      .select('id')
      .eq('client_name', 'Catalyst')
      .eq('active_date', task.active_date)
      .eq('created_date', '2025-10-14');
    
    if (existing && existing.length > 0) {
      console.log('✓ Task already exists for ' + task.active_date + ', skipping');
      continue;
    }
    
    // Find max priority in engineering section for this date
    const { data: engineeringTasks } = await supabase
      .from('daily_priorities')
      .select('priority_order')
      .eq('active_date', task.active_date)
      .eq('section', 'engineering')
      .order('priority_order', { ascending: false })
      .limit(1);
    
    const maxPriority = engineeringTasks && engineeringTasks.length > 0 
      ? engineeringTasks[0].priority_order 
      : 0;
    
    task.priority_order = maxPriority + 1;
    
    const { error } = await supabase
      .from('daily_priorities')
      .insert(task);
    
    if (error) {
      console.error('Error creating task for ' + task.active_date + ':', error);
    } else {
      console.log('✅ Created engineering task for ' + task.active_date + ' (priority ' + task.priority_order + ')');
    }
  }
  
  console.log('\n🎉 Catalyst engineering task restored!');
  console.log('   The pre-launch task (Oct 8) was completed on Oct 20');
  console.log('   The engineering task (Oct 14) is now active for Oct 22+');
}

restoreCatalystEngineering();
