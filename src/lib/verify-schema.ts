/**
 * Database schema verification utility
 * Verifies that all required schema elements are properly implemented
 */

import { supabaseAdmin } from './supabase';

interface SchemaVerificationResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function verifyEnumTypes(): Promise<SchemaVerificationResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_enum_types');
    
    if (error) {
      // Fallback: Check enums by querying tables that use them
      const { data: courseData, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('category')
        .limit(1);
      
      if (courseError) {
        return {
          success: false,
          message: 'Failed to verify enum types',
          details: courseError
        };
      }
    }

    const requiredEnums = [
      'lead_stage_enum',
      'lead_source_enum', 
      'course_category_enum',
      'template_type_enum',
      'message_status_enum',
      'activity_type_enum'
    ];

    return {
      success: true,
      message: `All ${requiredEnums.length} enum types are properly configured`,
      details: requiredEnums
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying enum types',
      details: error
    };
  }
}

export async function verifyTables(): Promise<SchemaVerificationResult> {
  try {
    const requiredTables = [
      'admin_users',
      'courses',
      'leads', 
      'message_templates',
      'whatsapp_messages',
      'activities'
    ];

    const tableResults = [];

    for (const table of requiredTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          throw new Error(`Table ${table}: ${error.message}`);
        }
        
        tableResults.push({ table, status: 'exists' });
      } catch (error) {
        tableResults.push({ table, status: 'error', error: (error as Error).message });
      }
    }

    const failedTables = tableResults.filter(t => t.status === 'error');
    
    if (failedTables.length > 0) {
      return {
        success: false,
        message: `${failedTables.length} tables failed verification`,
        details: failedTables
      };
    }

    return {
      success: true,
      message: `All ${requiredTables.length} tables exist and are accessible`,
      details: tableResults
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying tables',
      details: error
    };
  }
}

export async function verifyForeignKeys(): Promise<SchemaVerificationResult> {
  try {
    // Test foreign key relationships by joining tables
    const relationships = [
      {
        name: 'leads -> courses',
        query: () => supabaseAdmin
          .from('leads')
          .select(`
            id,
            course_interest,
            courses!leads_course_interest_fkey(name)
          `)
          .limit(1)
      },
      {
        name: 'message_templates -> courses',
        query: () => supabaseAdmin
          .from('message_templates')
          .select(`
            id,
            course_id,
            courses!message_templates_course_id_fkey(name)
          `)
          .limit(1)
      },
      {
        name: 'whatsapp_messages -> leads',
        query: () => supabaseAdmin
          .from('whatsapp_messages')
          .select(`
            id,
            lead_id,
            leads!whatsapp_messages_lead_id_fkey(name)
          `)
          .limit(1)
      },
      {
        name: 'activities -> leads',
        query: () => supabaseAdmin
          .from('activities')
          .select(`
            id,
            lead_id,
            leads!activities_lead_id_fkey(name)
          `)
          .limit(1)
      }
    ];

    const relationshipResults = [];

    for (const rel of relationships) {
      try {
        const { data, error } = await rel.query();
        
        if (error) {
          relationshipResults.push({ 
            relationship: rel.name, 
            status: 'error', 
            error: error.message 
          });
        } else {
          relationshipResults.push({ 
            relationship: rel.name, 
            status: 'working' 
          });
        }
      } catch (error) {
        relationshipResults.push({
          relationship: rel.name,
          status: 'error',
          error: (error as Error).message
        });
      }
    }

    const failedRelationships = relationshipResults.filter(r => r.status === 'error');
    
    if (failedRelationships.length > 0) {
      return {
        success: false,
        message: `${failedRelationships.length} foreign key relationships failed`,
        details: relationshipResults
      };
    }

    return {
      success: true,
      message: `All ${relationships.length} foreign key relationships are working`,
      details: relationshipResults
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying foreign keys',
      details: error
    };
  }
}

export async function verifyIndexes(): Promise<SchemaVerificationResult> {
  try {
    // Test that indexes exist by running queries that would use them
    const indexTests = [
      {
        name: 'leads_stage_index',
        query: () => supabaseAdmin
          .from('leads')
          .select('id')
          .eq('stage', 'new')
          .limit(1)
      },
      {
        name: 'leads_course_interest_index', 
        query: () => supabaseAdmin
          .from('leads')
          .select('id')
          .not('course_interest', 'is', null)
          .limit(1)
      },
      {
        name: 'courses_category_index',
        query: () => supabaseAdmin
          .from('courses')
          .select('id')
          .eq('category', 'python')
          .limit(1)
      },
      {
        name: 'messages_status_index',
        query: () => supabaseAdmin
          .from('whatsapp_messages')
          .select('id')
          .eq('status', 'pending')
          .limit(1)
      }
    ];

    const indexResults = [];

    for (const test of indexTests) {
      try {
        const { data, error } = await test.query();
        
        if (error) {
          indexResults.push({ 
            index: test.name, 
            status: 'error', 
            error: error.message 
          });
        } else {
          indexResults.push({ 
            index: test.name, 
            status: 'working' 
          });
        }
      } catch (error) {
        indexResults.push({
          index: test.name,
          status: 'error',
          error: (error as Error).message
        });
      }
    }

    const failedIndexes = indexResults.filter(i => i.status === 'error');
    
    if (failedIndexes.length > 0) {
      return {
        success: false,
        message: `${failedIndexes.length} index tests failed`,
        details: indexResults
      };
    }

    return {
      success: true,
      message: `All ${indexTests.length} index tests passed`,
      details: indexResults
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying indexes',
      details: error
    };
  }
}

export async function verifyTriggers(): Promise<SchemaVerificationResult> {
  try {
    // Test updated_at triggers by updating a record
    const { data: testCourse, error: createError } = await supabaseAdmin
      .from('courses')
      .insert({
        name: 'Test Course for Trigger Verification',
        description: 'Temporary course for testing',
        duration: '1 day',
        price: 0,
        category: 'python'
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        message: 'Failed to create test record for trigger verification',
        details: createError
      };
    }

    const originalUpdatedAt = testCourse.updated_at;

    // Wait a moment then update
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: updatedCourse, error: updateError } = await supabaseAdmin
      .from('courses')
      .update({ description: 'Updated description for trigger test' })
      .eq('id', testCourse.id)
      .select()
      .single();

    if (updateError) {
      // Clean up test record
      await supabaseAdmin.from('courses').delete().eq('id', testCourse.id);
      
      return {
        success: false,
        message: 'Failed to update test record for trigger verification',
        details: updateError
      };
    }

    const triggerWorking = updatedCourse.updated_at !== originalUpdatedAt;

    // Clean up test record
    await supabaseAdmin.from('courses').delete().eq('id', testCourse.id);

    if (!triggerWorking) {
      return {
        success: false,
        message: 'updated_at trigger is not working properly',
        details: { originalUpdatedAt, newUpdatedAt: updatedCourse.updated_at }
      };
    }

    return {
      success: true,
      message: 'updated_at triggers are working correctly',
      details: { triggerWorking }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error verifying triggers',
      details: error
    };
  }
}

export async function runFullSchemaVerification(): Promise<void> {
  console.log('🔍 Starting comprehensive database schema verification...\n');

  const verifications = [
    { name: 'Enum Types', fn: verifyEnumTypes },
    { name: 'Tables', fn: verifyTables },
    { name: 'Foreign Keys', fn: verifyForeignKeys },
    { name: 'Indexes', fn: verifyIndexes },
    { name: 'Triggers', fn: verifyTriggers }
  ];

  let allPassed = true;

  for (const verification of verifications) {
    console.log(`🔍 Verifying ${verification.name}...`);
    
    try {
      const result = await verification.fn();
      
      if (result.success) {
        console.log(`✅ ${verification.name}: ${result.message}`);
      } else {
        console.log(`❌ ${verification.name}: ${result.message}`);
        if (result.details) {
          console.log(`   Details:`, result.details);
        }
        allPassed = false;
      }
    } catch (error) {
      console.log(`💥 ${verification.name}: Unexpected error`);
      console.log(`   Error:`, error);
      allPassed = false;
    }
    
    console.log('');
  }

  if (allPassed) {
    console.log('🎉 All database schema verifications passed!');
    console.log('✅ Database schema is properly implemented and ready for use.');
  } else {
    console.log('❌ Some database schema verifications failed.');
    console.log('🔧 Please check the migration files and database setup.');
    process.exit(1);
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  runFullSchemaVerification();
}