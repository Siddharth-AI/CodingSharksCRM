import { supabase, supabaseAdmin, type Database } from './supabase';
import type { PostgrestError } from '@supabase/supabase-js';

// Database connection utilities and error handling
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection check error:', error);
    return false;
  }
}

// Enhanced error handling for Supabase operations
export function handleDatabaseError(error: PostgrestError | null): never {
  if (!error) {
    throw new DatabaseError('Unknown database error occurred');
  }

  // Map Supabase error codes to user-friendly messages
  switch (error.code) {
    case '23505': // Unique constraint violation
      throw new DatabaseError(
        'A record with this information already exists',
        'DUPLICATE_RECORD',
        error
      );
    case '23503': // Foreign key constraint violation
      throw new DatabaseError(
        'Cannot delete record due to existing references',
        'REFERENCE_EXISTS',
        error
      );
    case '23502': // Not null constraint violation
      throw new DatabaseError(
        'Required field is missing',
        'REQUIRED_FIELD',
        error
      );
    case '42P01': // Undefined table
      throw new DatabaseError(
        'Database table not found',
        'TABLE_NOT_FOUND',
        error
      );
    case '42703': // Undefined column
      throw new DatabaseError(
        'Database column not found',
        'COLUMN_NOT_FOUND',
        error
      );
    default:
      throw new DatabaseError(
        error.message || 'Database operation failed',
        error.code,
        error
      );
  }
}

// Generic database operation wrapper with error handling
export async function executeQuery<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      handleDatabaseError(error);
    }
    
    if (data === null) {
      throw new DatabaseError('No data returned from database operation');
    }
    
    return data;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    
    // Handle network or other unexpected errors
    throw new DatabaseError(
      'Database connection failed. Please try again.',
      'CONNECTION_ERROR',
      error
    );
  }
}

// Database migration utilities
export async function runMigrations(): Promise<void> {
  try {
    // Check if migrations table exists
    const { error: migrationCheckError } = await supabaseAdmin
      .from('schema_migrations')
      .select('version')
      .limit(1);
    
    if (migrationCheckError && migrationCheckError.code === '42P01') {
      // Create migrations table if it doesn't exist
      await supabaseAdmin.rpc('create_migrations_table');
    }
    
    console.log('Database migrations check completed');
  } catch (error) {
    console.error('Migration check failed:', error);
    throw new DatabaseError('Failed to check database migrations', 'MIGRATION_ERROR', error);
  }
}

// Database connection retry logic
export async function connectWithRetry(
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        console.log(`Database connected successfully on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
    }
    
    if (attempt < maxRetries) {
      console.log(`Retrying database connection in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryDelay *= 2; // Exponential backoff
    }
  }
  
  throw new DatabaseError(
    `Failed to connect to database after ${maxRetries} attempts`,
    'CONNECTION_TIMEOUT'
  );
}

// Type-safe database client exports
export { supabase, supabaseAdmin };
export type { Database };

// Table type helpers
export type AdminUser = Database['public']['Tables']['admin_users']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type MessageTemplate = Database['public']['Tables']['message_templates']['Row'];
export type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];

export type CreateAdminUser = Database['public']['Tables']['admin_users']['Insert'];
export type CreateCourse = Database['public']['Tables']['courses']['Insert'];
export type CreateLead = Database['public']['Tables']['leads']['Insert'];
export type CreateMessageTemplate = Database['public']['Tables']['message_templates']['Insert'];
export type CreateWhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Insert'];
export type CreateActivity = Database['public']['Tables']['activities']['Insert'];

export type UpdateAdminUser = Database['public']['Tables']['admin_users']['Update'];
export type UpdateCourse = Database['public']['Tables']['courses']['Update'];
export type UpdateLead = Database['public']['Tables']['leads']['Update'];
export type UpdateMessageTemplate = Database['public']['Tables']['message_templates']['Update'];
export type UpdateWhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Update'];
export type UpdateActivity = Database['public']['Tables']['activities']['Update'];