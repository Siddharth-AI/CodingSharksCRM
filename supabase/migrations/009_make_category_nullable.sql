-- Make category column nullable on courses table
-- Category was made optional in the application but the DB constraint was not updated

ALTER TABLE courses ALTER COLUMN category DROP NOT NULL;
