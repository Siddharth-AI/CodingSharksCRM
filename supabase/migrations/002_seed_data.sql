-- Seed data for CRM + WhatsApp Automation System
-- This migration populates the database with initial data for development and testing

-- Insert default admin user (password: #coding20@SharkAP - hashed with bcrypt)
INSERT INTO admin_users (id, email, name, password_hash, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@crmwhatsapp.com', 'System Administrator', '$2b$12$tfdAu5lUwelI7/pPGlmqCOnWLaqPSRsyWxkuTnLUu5XCy2jbxqIZu', true);

-- Insert sample courses
INSERT INTO courses (id, name, description, duration, price, category, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Python Programming Fundamentals', 'Complete Python programming course covering basics to advanced concepts', '3 months', 15000.00, 'python', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'AI/ML Mastery Program', 'Comprehensive Artificial Intelligence and Machine Learning course', '6 months', 35000.00, 'ai_ml', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Data Science Professional', 'End-to-end Data Science program with real-world projects', '4 months', 25000.00, 'data_science', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Full Stack Web Development', 'Complete web development course covering frontend and backend', '5 months', 20000.00, 'web_development', true);

-- Insert default message templates for each course
-- Python course templates
INSERT INTO message_templates (course_id, type, name, content, variables) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'welcome', 'Python Welcome Message', 
   'Hi {{name}}! 🐍 Welcome to our Python Programming Fundamentals course! We''re excited to have you join us. Your journey into the world of Python starts here. Our team will contact you within 24 hours to discuss the course details and schedule. For any immediate queries, feel free to reach out!', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440001', 'follow_up_day_1', 'Python Day 1 Follow-up', 
   'Hello {{name}}! 👋 Hope you''re excited about starting your Python journey! Just a quick reminder that our Python Programming Fundamentals course offers hands-on coding experience with real projects. Have you had a chance to review the course curriculum we shared? Let us know if you have any questions!', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440001', 'follow_up_day_2', 'Python Day 2 Follow-up', 
   'Hi {{name}}! 🚀 Day 2 check-in for your Python course inquiry. Did you know that Python is one of the most in-demand programming languages? Our course covers everything from basics to advanced topics like web scraping and automation. Would you like to schedule a call to discuss your learning goals?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440001', 'follow_up_day_3', 'Python Day 3 Follow-up', 
   'Hello {{name}}! 💻 Final reminder about our Python Programming Fundamentals course. We have limited seats available for the next batch starting soon. Our students have successfully transitioned to developer roles after completing this course. Ready to secure your spot? Let''s connect today!', 
   '["name"]');

-- AI/ML course templates
INSERT INTO message_templates (course_id, type, name, content, variables) VALUES
  ('550e8400-e29b-41d4-a716-446655440002', 'welcome', 'AI/ML Welcome Message', 
   'Welcome {{name}}! 🤖 Thank you for your interest in our AI/ML Mastery Program! You''re about to embark on an exciting journey into Artificial Intelligence and Machine Learning. This comprehensive 6-month program will transform you into an AI/ML professional. We''ll be in touch within 24 hours!', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440002', 'follow_up_day_1', 'AI/ML Day 1 Follow-up', 
   'Hi {{name}}! 🧠 Excited about diving into AI/ML? Our program covers everything from neural networks to deep learning, with hands-on projects using TensorFlow and PyTorch. Have you checked out our success stories? Our graduates are working at top tech companies! Any questions about the curriculum?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440002', 'follow_up_day_2', 'AI/ML Day 2 Follow-up', 
   'Hello {{name}}! 🔬 Day 2 of your AI/ML journey inquiry. The field of AI is growing exponentially, and now is the perfect time to get in. Our program includes real-world projects, industry mentorship, and job placement assistance. Would you like to speak with one of our AI experts?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440002', 'follow_up_day_3', 'AI/ML Day 3 Follow-up', 
   'Hi {{name}}! 🚀 Last call for our AI/ML Mastery Program! This is your chance to be part of the AI revolution. With the increasing demand for AI professionals, this investment in your career could be life-changing. Limited seats available - shall we reserve yours today?', 
   '["name"]');

-- Data Science course templates
INSERT INTO message_templates (course_id, type, name, content, variables) VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'welcome', 'Data Science Welcome Message', 
   'Welcome {{name}}! 📊 Thank you for choosing our Data Science Professional program! Get ready to unlock the power of data and become a skilled data scientist. Our 4-month intensive program covers statistics, machine learning, and big data technologies. We''ll contact you soon with next steps!', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440003', 'follow_up_day_1', 'Data Science Day 1 Follow-up', 
   'Hi {{name}}! 📈 Ready to become a data detective? Our Data Science program teaches you to extract insights from complex datasets using Python, R, and SQL. You''ll work on real business problems and build an impressive portfolio. Have you reviewed our project showcase?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440003', 'follow_up_day_2', 'Data Science Day 2 Follow-up', 
   'Hello {{name}}! 💡 Data Science is the career of the future! Our program combines theory with practical application - from data visualization to predictive modeling. Plus, we provide career support and interview preparation. Interested in learning more about our placement record?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440003', 'follow_up_day_3', 'Data Science Day 3 Follow-up', 
   'Hi {{name}}! 🎯 Final opportunity to join our Data Science Professional program! With companies increasingly relying on data-driven decisions, data scientists are in high demand. Don''t miss this chance to transform your career. Ready to take the next step?', 
   '["name"]');

-- Web Development course templates
INSERT INTO message_templates (course_id, type, name, content, variables) VALUES
  ('550e8400-e29b-41d4-a716-446655440004', 'welcome', 'Web Development Welcome Message', 
   'Welcome {{name}}! 🌐 Excited to have you interested in our Full Stack Web Development course! You''re about to learn the most in-demand web technologies - React, Node.js, databases, and more. Our 5-month program will make you job-ready. We''ll be in touch within 24 hours!', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440004', 'follow_up_day_1', 'Web Development Day 1 Follow-up', 
   'Hi {{name}}! 💻 Ready to build amazing websites and web applications? Our Full Stack course covers both frontend (React, HTML, CSS) and backend (Node.js, Express, MongoDB) development. You''ll create real projects for your portfolio. Have any questions about the tech stack?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440004', 'follow_up_day_2', 'Web Development Day 2 Follow-up', 
   'Hello {{name}}! 🚀 Web development offers incredible career opportunities! Our graduates work as full-stack developers, frontend specialists, and backend engineers. The course includes live projects, code reviews, and industry best practices. Want to see what our students have built?', 
   '["name"]'),
  ('550e8400-e29b-41d4-a716-446655440004', 'follow_up_day_3', 'Web Development Day 3 Follow-up', 
   'Hi {{name}}! 🎨 Last chance to join our Full Stack Web Development program! The web development field is booming with remote work opportunities and competitive salaries. Our comprehensive curriculum ensures you''re industry-ready. Shall we secure your enrollment today?', 
   '["name"]');

-- Insert sample leads for testing
INSERT INTO leads (id, name, email, mobile, course_interest, stage, source, notes, assigned_to) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Rahul Sharma', 'rahul.sharma@email.com', '+919876543210', '550e8400-e29b-41d4-a716-446655440001', 'new', 'website', 'Interested in Python for career change', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Priya Patel', 'priya.patel@email.com', '+919876543211', '550e8400-e29b-41d4-a716-446655440002', 'contacted', 'referral', 'Has basic programming knowledge', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Amit Kumar', 'amit.kumar@email.com', '+919876543212', '550e8400-e29b-41d4-a716-446655440003', 'interested', 'social_media', 'Working professional looking to upskill', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Sneha Gupta', 'sneha.gupta@email.com', '+919876543213', '550e8400-e29b-41d4-a716-446655440004', 'converted', 'advertisement', 'Enrolled in web development course', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample activities
INSERT INTO activities (lead_id, type, description, metadata, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'lead_created', 'New lead created from website form', '{"source": "website", "form_id": "contact_form"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440011', 'lead_created', 'New lead created from referral', '{"source": "referral", "referrer": "existing_student"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440011', 'stage_changed', 'Lead stage changed from new to contacted', '{"old_stage": "new", "new_stage": "contacted"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440012', 'lead_created', 'New lead created from social media', '{"source": "social_media", "platform": "facebook"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440012', 'stage_changed', 'Lead stage changed from new to contacted', '{"old_stage": "new", "new_stage": "contacted"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440012', 'stage_changed', 'Lead stage changed from contacted to interested', '{"old_stage": "contacted", "new_stage": "interested"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440013', 'lead_created', 'New lead created from advertisement', '{"source": "advertisement", "campaign": "google_ads"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440013', 'stage_changed', 'Lead stage changed from new to contacted', '{"old_stage": "new", "new_stage": "contacted"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440013', 'stage_changed', 'Lead stage changed from contacted to interested', '{"old_stage": "contacted", "new_stage": "interested"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440013', 'stage_changed', 'Lead stage changed from interested to converted', '{"old_stage": "interested", "new_stage": "converted"}', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample WhatsApp messages
INSERT INTO whatsapp_messages (lead_id, template_id, content, status, sent_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 
   (SELECT id FROM message_templates WHERE course_id = '550e8400-e29b-41d4-a716-446655440001' AND type = 'welcome'),
   'Hi Rahul! 🐍 Welcome to our Python Programming Fundamentals course! We''re excited to have you join us. Your journey into the world of Python starts here. Our team will contact you within 24 hours to discuss the course details and schedule. For any immediate queries, feel free to reach out!',
   'delivered',
   NOW() - INTERVAL '2 hours'),
  ('550e8400-e29b-41d4-a716-446655440011',
   (SELECT id FROM message_templates WHERE course_id = '550e8400-e29b-41d4-a716-446655440002' AND type = 'welcome'),
   'Welcome Priya! 🤖 Thank you for your interest in our AI/ML Mastery Program! You''re about to embark on an exciting journey into Artificial Intelligence and Machine Learning. This comprehensive 6-month program will transform you into an AI/ML professional. We''ll be in touch within 24 hours!',
   'read',
   NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440012',
   (SELECT id FROM message_templates WHERE course_id = '550e8400-e29b-41d4-a716-446655440003' AND type = 'welcome'),
   'Welcome Amit! 📊 Thank you for choosing our Data Science Professional program! Get ready to unlock the power of data and become a skilled data scientist. Our 4-month intensive program covers statistics, machine learning, and big data technologies. We''ll contact you soon with next steps!',
   'delivered',
   NOW() - INTERVAL '3 days');