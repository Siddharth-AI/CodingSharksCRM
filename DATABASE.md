# Database Setup Guide

This document provides comprehensive information about the database schema and setup for the CRM + WhatsApp Automation System.

## Overview

The system uses **Supabase** (PostgreSQL) as the database backend with a fully normalized schema designed for:
- Lead management and tracking
- Course catalog management  
- WhatsApp message automation
- Activity timeline logging
- Admin user management

## Database Schema

### Tables

#### 1. `admin_users`
Stores system administrators who can access the CRM.
```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- name (VARCHAR)
- password_hash (VARCHAR)
- is_active (BOOLEAN)
- last_login_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 2. `courses`
Stores available courses offered by the institute.
```sql
- id (UUID, Primary Key)
- name (VARCHAR, Unique)
- description (TEXT)
- duration (VARCHAR)
- price (DECIMAL)
- category (course_category_enum)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 3. `leads`
Stores potential students and their information.
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- email (VARCHAR)
- mobile (VARCHAR)
- course_interest (UUID, FK to courses)
- stage (lead_stage_enum)
- source (lead_source_enum)
- notes (TEXT)
- assigned_to (UUID, FK to admin_users)
- last_contacted_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 4. `message_templates`
Stores WhatsApp message templates for different courses and scenarios.
```sql
- id (UUID, Primary Key)
- course_id (UUID, FK to courses)
- type (template_type_enum)
- name (VARCHAR)
- content (TEXT)
- variables (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 5. `whatsapp_messages`
Logs all WhatsApp messages sent to leads.
```sql
- id (UUID, Primary Key)
- lead_id (UUID, FK to leads)
- template_id (UUID, FK to message_templates)
- content (TEXT)
- status (message_status_enum)
- sent_at (TIMESTAMPTZ)
- delivered_at (TIMESTAMPTZ)
- read_at (TIMESTAMPTZ)
- error_message (TEXT)
- retry_count (INTEGER)
- created_at (TIMESTAMPTZ)
```

#### 6. `activities`
Tracks all activities and interactions with leads.
```sql
- id (UUID, Primary Key)
- lead_id (UUID, FK to leads)
- type (activity_type_enum)
- description (TEXT)
- metadata (JSONB)
- created_by (UUID, FK to admin_users)
- created_at (TIMESTAMPTZ)
```

### Enum Types

#### `lead_stage_enum`
- `new` - Newly created lead
- `contacted` - Lead has been contacted
- `interested` - Lead showed interest
- `converted` - Lead enrolled in course

#### `lead_source_enum`
- `website` - From website form
- `referral` - Referred by existing student
- `social_media` - From social media
- `advertisement` - From ads
- `walk_in` - Direct visit

#### `course_category_enum`
- `python` - Python Programming
- `ai_ml` - AI/ML courses
- `data_science` - Data Science courses
- `web_development` - Web Development courses

#### `template_type_enum`
- `welcome` - Welcome message
- `follow_up_day_1` - Day 1 follow-up
- `follow_up_day_2` - Day 2 follow-up
- `follow_up_day_3` - Day 3 follow-up
- `custom` - Custom templates

#### `message_status_enum`
- `pending` - Queued for sending
- `sent` - Successfully sent
- `delivered` - Delivered to recipient
- `read` - Read by recipient
- `failed` - Failed to send

#### `activity_type_enum`
- `lead_created` - New lead created
- `stage_changed` - Lead stage updated
- `message_sent` - Message sent to lead
- `note_added` - Note added to lead
- `lead_updated` - Lead information updated

## Database Features

### Indexes
Performance-optimized indexes on frequently queried columns:
- `leads.stage` - For Kanban board queries
- `leads.course_interest` - For course-based filtering
- `leads.mobile` - For duplicate checking
- `courses.category` - For course filtering
- `whatsapp_messages.status` - For message processing
- `activities.lead_id` - For timeline queries

### Triggers
Automatic `updated_at` timestamp updates for:
- `admin_users`
- `courses`
- `leads`
- `message_templates`

### Row Level Security (RLS)
- Enabled on all tables
- Policies configured for authenticated admin users
- Ensures data security and access control

### Foreign Key Relationships
- `leads.course_interest` → `courses.id`
- `leads.assigned_to` → `admin_users.id`
- `message_templates.course_id` → `courses.id`
- `whatsapp_messages.lead_id` → `leads.id`
- `whatsapp_messages.template_id` → `message_templates.id`
- `activities.lead_id` → `leads.id`
- `activities.created_by` → `admin_users.id`

## Setup Instructions

### 1. Environment Configuration
Ensure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Migration Files
The database schema is defined in migration files:
- `supabase/migrations/001_initial_schema.sql` - Core schema
- `supabase/migrations/002_seed_data.sql` - Sample data

### 3. Applying Migrations

#### Option A: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

#### Option B: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and execute the contents of each migration file in order

#### Option C: Manual Execution
Run the SQL files directly in your PostgreSQL database.

### 4. Verification
After applying migrations, verify the setup:

```bash
# Test database connection and schema
npm run db:test

# Comprehensive schema verification
npm run db:verify

# Full deployment verification
npm run db:deploy
```

## Sample Data

The system includes sample data for development and testing:
- 1 admin user (admin@crmwhatsapp.com / admin123)
- 4 courses (Python, AI/ML, Data Science, Web Development)
- Message templates for each course
- Sample leads in different stages
- Activity timeline entries
- Sample WhatsApp messages

## Database Operations

### Connection Management
The system uses two Supabase clients:
- `supabase` - For frontend operations with RLS
- `supabaseAdmin` - For backend operations with elevated privileges

### Error Handling
Comprehensive error handling for:
- Connection failures
- Constraint violations
- Foreign key errors
- Validation errors

### Type Safety
Full TypeScript integration with:
- Generated database types
- Type-safe query builders
- Compile-time error checking

## Maintenance

### Backup
Supabase automatically handles backups, but you can also:
- Export data via Supabase Dashboard
- Use `pg_dump` for manual backups
- Set up automated backup scripts

### Monitoring
Monitor database performance via:
- Supabase Dashboard metrics
- Query performance insights
- Connection pool monitoring

### Scaling
The schema is designed to scale with:
- Proper indexing for performance
- Normalized structure to reduce redundancy
- Efficient foreign key relationships

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check environment variables
   - Verify Supabase project status
   - Confirm network connectivity

2. **Migration Failures**
   - Ensure proper permissions
   - Check for existing data conflicts
   - Verify SQL syntax

3. **RLS Policy Issues**
   - Check authentication status
   - Verify policy configurations
   - Test with service role key

### Debug Commands
```bash
# Test basic connection
npm run db:test

# Verify complete schema
npm run db:verify

# Check migration status
npm run db:deploy
```

## Security Considerations

- All tables have RLS enabled
- Service role key should be kept secure
- Regular security updates via Supabase
- Audit logs available in Supabase Dashboard
- Encrypted connections (SSL/TLS)

## Performance Optimization

- Strategic indexing on query columns
- Efficient foreign key relationships
- Proper data types for storage optimization
- Connection pooling via Supabase
- Query optimization recommendations

This database setup provides a robust foundation for the CRM + WhatsApp Automation System with excellent performance, security, and scalability characteristics.