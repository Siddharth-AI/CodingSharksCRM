-- Fix RLS Policies for CRM WhatsApp System
-- This migration updates the RLS policies to allow proper data access

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin users can access all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin users can access all courses" ON courses;
DROP POLICY IF EXISTS "Admin users can access all leads" ON leads;
DROP POLICY IF EXISTS "Admin users can access all message_templates" ON message_templates;
DROP POLICY IF EXISTS "Admin users can access all whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Admin users can access all activities" ON activities;

-- Create more permissive policies for development
-- These policies allow service role (backend API) full access to all tables

-- Admin Users table policies
CREATE POLICY "Allow service role full access to admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to admin_users" ON admin_users
  FOR SELECT USING (true);

-- Courses table policies  
CREATE POLICY "Allow service role full access to courses" ON courses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to courses" ON courses
  FOR SELECT USING (true);

-- Leads table policies
CREATE POLICY "Allow service role full access to leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to leads" ON leads
  FOR SELECT USING (true);

-- Message Templates table policies
CREATE POLICY "Allow service role full access to message_templates" ON message_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to message_templates" ON message_templates
  FOR SELECT USING (true);

-- WhatsApp Messages table policies
CREATE POLICY "Allow service role full access to whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to whatsapp_messages" ON whatsapp_messages
  FOR SELECT USING (true);

-- Activities table policies
CREATE POLICY "Allow service role full access to activities" ON activities
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow anon read access to activities" ON activities
  FOR SELECT USING (true);

-- Alternative: If you want to completely disable RLS for development (uncomment below)
-- WARNING: This removes all security - only use for development!

-- ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE activities DISABLE ROW LEVEL SECURITY;