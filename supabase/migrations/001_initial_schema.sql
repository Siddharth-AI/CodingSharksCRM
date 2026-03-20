-- Initial database schema for CRM + WhatsApp Automation System
-- This migration creates all tables, enums, and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE lead_stage_enum AS ENUM ('new', 'contacted', 'interested', 'converted');
CREATE TYPE lead_source_enum AS ENUM ('website', 'referral', 'social_media', 'advertisement', 'walk_in');
CREATE TYPE course_category_enum AS ENUM ('python', 'ai_ml', 'data_science', 'web_development');
CREATE TYPE template_type_enum AS ENUM ('welcome', 'follow_up_day_1', 'follow_up_day_2', 'follow_up_day_3', 'custom');
CREATE TYPE message_status_enum AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE activity_type_enum AS ENUM ('lead_created', 'stage_changed', 'message_sent', 'note_added', 'lead_updated');

-- Admin Users Table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses Table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  duration VARCHAR(100),
  price DECIMAL(10,2),
  category course_category_enum NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads Table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  course_interest UUID REFERENCES courses(id),
  stage lead_stage_enum NOT NULL DEFAULT 'new',
  source lead_source_enum NOT NULL,
  notes TEXT,
  assigned_to UUID REFERENCES admin_users(id),
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Templates Table
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  type template_type_enum NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, type)
);

-- WhatsApp Messages Table
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id),
  content TEXT NOT NULL,
  status message_status_enum DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities Table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type_enum NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_course_interest ON leads(course_interest);
CREATE INDEX idx_leads_mobile ON leads(mobile);
CREATE INDEX idx_leads_created_at ON leads(created_at);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_is_active ON courses(is_active);

CREATE INDEX idx_templates_course_id ON message_templates(course_id);
CREATE INDEX idx_templates_type ON message_templates(type);

CREATE INDEX idx_messages_lead_id ON whatsapp_messages(lead_id);
CREATE INDEX idx_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_messages_created_at ON whatsapp_messages(created_at);

CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_created_at ON activities(created_at);

CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies for authenticated users)
-- Note: These will be refined based on specific authentication requirements

-- Admin users can access all data
CREATE POLICY "Admin users can access all admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can access all courses" ON courses
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can access all leads" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can access all message_templates" ON message_templates
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can access all whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can access all activities" ON activities
  FOR ALL USING (auth.role() = 'authenticated');