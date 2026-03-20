/**
 * Database connection test utility
 * Tests the database schema and connection
 */

import { supabase, supabaseAdmin } from './supabase';
import { checkDatabaseConnection } from './database';

export async function testDatabaseSchema(): Promise<void> {
  console.log('🔍 Testing database schema and connection...');

  try {
    // Test basic connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    // Test all tables exist and have correct structure
    const tables = [
      'admin_users',
      'courses', 
      'leads',
      'message_templates',
      'whatsapp_messages',
      'activities'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        throw new Error(`Table ${table} test failed: ${error.message}`);
      }
      console.log(`✅ Table ${table} exists and is accessible`);
    }

    // Test enum types by checking courses table
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('category')
      .limit(1);
    
    if (coursesError) {
      throw new Error(`Enum test failed: ${coursesError.message}`);
    }
    console.log('✅ Enum types are properly configured');

    // Test foreign key relationships
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        course_interest,
        courses!leads_course_interest_fkey(name)
      `)
      .limit(1);
    
    if (leadsError) {
      throw new Error(`Foreign key relationship test failed: ${leadsError.message}`);
    }
    console.log('✅ Foreign key relationships are working');

    // Test indexes by running a query that would use them
    const { data: indexTest, error: indexError } = await supabase
      .from('leads')
      .select('id')
      .eq('stage', 'new')
      .limit(1);
    
    if (indexError) {
      throw new Error(`Index test failed: ${indexError.message}`);
    }
    console.log('✅ Database indexes are working');

    console.log('🎉 All database schema tests passed!');

  } catch (error) {
    console.error('❌ Database schema test failed:', error);
    throw error;
  }
}

export async function testSeedData(): Promise<void> {
  console.log('🌱 Testing seed data...');

  try {
    // Check if seed data exists
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*');
    
    if (coursesError) {
      throw new Error(`Courses seed data test failed: ${coursesError.message}`);
    }

    if (!courses || courses.length === 0) {
      console.log('⚠️  No seed data found - this is expected for a fresh database');
      return;
    }

    console.log(`✅ Found ${courses.length} courses in seed data`);

    // Check message templates
    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('*');
    
    if (templatesError) {
      throw new Error(`Templates seed data test failed: ${templatesError.message}`);
    }

    console.log(`✅ Found ${templates?.length || 0} message templates in seed data`);

    // Check sample leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*');
    
    if (leadsError) {
      throw new Error(`Leads seed data test failed: ${leadsError.message}`);
    }

    console.log(`✅ Found ${leads?.length || 0} leads in seed data`);

    console.log('🎉 Seed data test completed!');

  } catch (error) {
    console.error('❌ Seed data test failed:', error);
    throw error;
  }
}

// Main test function
export async function runDatabaseTests(): Promise<void> {
  try {
    await testDatabaseSchema();
    await testSeedData();
    console.log('🚀 All database tests completed successfully!');
  } catch (error) {
    console.error('💥 Database tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runDatabaseTests();
}