import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Sync yesterday's task locations and priority orders to today
 * This fixes the issue where tasks moved/updated yesterday didn't maintain
 * those changes on today's page.
 */
async function syncYesterdayToToday() {
  // Calculate dates
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log('🔄 Syncing tasks from yesterday to today...\n');
  console.log(`Yesterday: ${yesterdayStr}`);
  console.log(`Today: ${todayStr}\n`);

  // Fetch all tasks from yesterday
  const { data: yesterdayTasks, error: yesterdayError } = await supabase
    .from('daily_priorities')
    .select('*')
    .eq('active_date', yesterdayStr)
    .order('section')
    .order('priority_order');

  if (yesterdayError) {
    console.error('❌ Error fetching yesterday\'s tasks:', yesterdayError);
    return;
  }

  if (!yesterdayTasks || yesterdayTasks.length === 0) {
    console.log('⚠️  No tasks found for yesterday. Nothing to sync.');
    return;
  }

  console.log(`📋 Found ${yesterdayTasks.length} tasks from yesterday\n`);

  // Fetch all tasks from today
  const { data: todayTasks, error: todayError } = await supabase
    .from('daily_priorities')
    .select('*')
    .eq('active_date', todayStr);

  if (todayError) {
    console.error('❌ Error fetching today\'s tasks:', todayError);
    return;
  }

  if (!todayTasks || todayTasks.length === 0) {
    console.log('⚠️  No tasks found for today. Carry-forward may not have run yet.');
    console.log('   You may need to visit today\'s page in the app first to trigger carry-forward.\n');
    return;
  }

  console.log(`📋 Found ${todayTasks.length} tasks for today\n`);

  // Create a map of today's tasks by task identity (client_name + created_at)
  const todayTasksMap = new Map();
  todayTasks.forEach(task => {
    const key = `${task.client_name || 'null'}_${task.created_at}`;
    todayTasksMap.set(key, task);
  });

  // Track updates
  let updatedCount = 0;
  let skippedCount = 0;
  const updates = [];

  // Process each yesterday task
  for (const yesterdayTask of yesterdayTasks) {
    // Skip completed tasks (they shouldn't be carried forward anyway)
    if (yesterdayTask.completed) {
      continue;
    }

    // Skip tasks without created_at (corrupted data)
    if (!yesterdayTask.created_at) {
      console.warn(`⚠️  Skipping task without created_at: ${yesterdayTask.client_name || 'Unnamed'}`);
      skippedCount++;
      continue;
    }

    const taskKey = `${yesterdayTask.client_name || 'null'}_${yesterdayTask.created_at}`;
    const todayTask = todayTasksMap.get(taskKey);

    if (!todayTask) {
      // Task exists on yesterday but not today - carry-forward may not have run
      console.log(`ℹ️  Task "${yesterdayTask.client_name || 'Unnamed'}" exists yesterday but not today (may need carry-forward)`);
      continue;
    }

    // Check if section or priority_order differs
    const sectionChanged = todayTask.section !== yesterdayTask.section;
    const orderChanged = todayTask.priority_order !== yesterdayTask.priority_order;

    if (!sectionChanged && !orderChanged) {
      // Already in sync, skip
      continue;
    }

    // Prepare update
    const updateData = {};
    if (sectionChanged) {
      updateData.section = yesterdayTask.section;
      console.log(`📦 "${yesterdayTask.client_name || 'Unnamed'}"`);
      console.log(`   Section: ${todayTask.section} → ${yesterdayTask.section}`);
    }
    if (orderChanged) {
      updateData.priority_order = yesterdayTask.priority_order;
      if (!sectionChanged) {
        console.log(`📦 "${yesterdayTask.client_name || 'Unnamed'}"`);
      }
      console.log(`   Priority: ${todayTask.priority_order} → ${yesterdayTask.priority_order}`);
    }

    updates.push({
      id: todayTask.id,
      client_name: yesterdayTask.client_name || 'Unnamed',
      updateData,
      oldSection: todayTask.section,
      newSection: yesterdayTask.section,
      oldOrder: todayTask.priority_order,
      newOrder: yesterdayTask.priority_order
    });
  }

  if (updates.length === 0) {
    console.log('✅ All tasks are already in sync! No updates needed.\n');
    return;
  }

  console.log(`\n📝 Found ${updates.length} tasks that need updating:\n`);

  // Two-phase approach to handle circular conflicts:
  // Phase 1: Move all tasks to temporary positions (negative numbers) AND update sections
  // Phase 2: Move them to their final priority_order positions
  
  console.log('Phase 1: Moving tasks to temporary positions...\n');
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    const tempPriority = -(1000 + i); // Use large negative numbers
    
    // In Phase 1, update both section (if changing) and priority_order to temp
    const phase1Update = {
      priority_order: tempPriority
    };
    
    // If section is changing, update it in Phase 1
    if (update.updateData.section) {
      phase1Update.section = update.newSection;
    }
    
    const { error } = await supabase
      .from('daily_priorities')
      .update(phase1Update)
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Error moving "${update.client_name}" to temp position:`, error);
      console.error(`   This task will be skipped in Phase 2`);
    } else {
      console.log(`   Moved "${update.client_name}" to temp position ${tempPriority}`);
    }
  }

  console.log('\nPhase 2: Moving tasks to final positions...\n');
  // Now apply final positions - no conflicts possible since temp positions are unique
  for (const update of updates) {
    const updateData = { ...update.updateData };

    // Apply the update
    const { error } = await supabase
      .from('daily_priorities')
      .update(updateData)
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Error updating task "${update.client_name}":`, error);
      skippedCount++;
    } else {
      updatedCount++;
      console.log(`✅ Updated "${update.client_name}"`);
    }
  }

  console.log(`\n✨ Sync complete!`);
  console.log(`   Updated: ${updatedCount} tasks`);
  console.log(`   Skipped: ${skippedCount} tasks`);
  console.log(`\n💡 Note: This only updates today's tasks. Future dates will be updated`);
  console.log(`   automatically when you make changes going forward (thanks to the code fix).\n`);
}

// Run the sync
syncYesterdayToToday().catch(console.error);

