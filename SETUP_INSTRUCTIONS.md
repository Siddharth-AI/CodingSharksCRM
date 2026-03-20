# CRM WhatsApp System Setup Instructions

## Issues Found and Solutions

### 1. Supabase Configuration Issue

**Problem**: The `.env.local` file contains placeholder values instead of actual Supabase credentials.

**Solution**: 
1. Go to your Supabase project dashboard
2. Get your project URL and API keys
3. Update the `.env.local` file with actual values:

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 2. RLS Policy Issue

**Problem**: The current RLS policies are too restrictive and prevent data access.

**Solution**: Update RLS policies to allow proper access. Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin users can access all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can access all courses" ON courses;
DROP POLICY IF EXISTS "Admin users can access all leads" ON leads;
DROP POLICY IF EXISTS "Admin users can access all message_templates" ON message_templates;
DROP POLICY IF EXISTS "Admin users can access all whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admin users can access all activities" ON activities;

-- Create more permissive policies for development
-- Note: For production, you should implement proper user-based policies

-- Allow all operations for authenticated users (service role)
CREATE POLICY "Allow service role full access" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON courses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON message_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON activities
  FOR ALL USING (auth.role() = 'service_role');

-- Alternatively, if you want to disable RLS temporarily for development:
-- ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
```

### 3. Database Migration Setup

**Steps to set up the database properly:**

1. **Apply the initial schema migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

2. **Apply the seed data migration:**
   - Copy and paste the contents of `supabase/migrations/002_seed_data.sql`
   - Run the SQL

3. **Verify the setup:**
   ```bash
   npm run db:test
   ```

### 4. Quick Setup Script

Here's a quick setup checklist:

1. **Update Environment Variables**:
   - Replace placeholder values in `.env.local` with actual Supabase credentials

2. **Run Database Migrations**:
   - Execute both SQL migration files in Supabase Dashboard

3. **Update RLS Policies** (choose one):
   - Option A: Use the updated policies above
   - Option B: Temporarily disable RLS for development

4. **Test the Setup**:
   ```bash
   npm run db:test
   npm run dev
   ```

### 5. Expected Results After Fix

After applying these fixes, you should see:
- ✅ Database connection successful
- ✅ All tables accessible
- ✅ Sample data loaded (4 courses, 4 leads, message templates)
- ✅ Dashboard showing statistics
- ✅ Leads page showing Kanban board with sample leads
- ✅ All API endpoints working

### 6. Troubleshooting

If you still see issues:

1. **Check Supabase Project Status**: Ensure your Supabase project is active
2. **Verify API Keys**: Make sure you're using the correct project's API keys
3. **Check Network**: Ensure you can access Supabase from your network
4. **Review Logs**: Check browser console and network tab for specific errors

### 7. Production Considerations

For production deployment:
- Implement proper authentication-based RLS policies
- Use environment-specific configuration
- Set up proper error handling and logging
- Configure CORS and security headers