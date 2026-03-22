-- Category lookup table
CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Seed default categories
INSERT INTO category (id, name, sort_order) VALUES
  ('cat-development', 'Development', 1),
  ('cat-design', 'Design', 2),
  ('cat-marketing', 'Marketing', 3),
  ('cat-support', 'Customer Support', 4),
  ('cat-consulting', 'Consulting', 5),
  ('cat-operations', 'Operations', 6),
  ('cat-legal', 'Legal', 7),
  ('cat-finance', 'Finance', 8);

-- Assign default categories to user profiles
UPDATE user_profile SET default_category = 'Development' WHERE user_id = 'dev-contractor';
UPDATE user_profile SET default_category = 'Development' WHERE user_id = 'user-marco';
UPDATE user_profile SET default_category = 'Marketing' WHERE user_id = 'user-elena';
UPDATE user_profile SET default_category = 'Design' WHERE user_id = 'user-kai';
UPDATE user_profile SET default_category = 'Development' WHERE user_id = 'user-priya';
UPDATE user_profile SET default_category = 'Consulting' WHERE user_id = 'user-alex';
UPDATE user_profile SET default_category = 'Operations' WHERE user_id = 'user-sarah';

-- Backfill categories on existing invoices based on their user's default category
UPDATE invoice SET category = 'Development' WHERE user_id IN ('dev-contractor', 'user-marco', 'user-priya') AND category IS NULL;
UPDATE invoice SET category = 'Marketing' WHERE user_id = 'user-elena' AND category IS NULL;
UPDATE invoice SET category = 'Design' WHERE user_id = 'user-kai' AND category IS NULL;
UPDATE invoice SET category = 'Consulting' WHERE user_id = 'user-alex' AND category IS NULL;
UPDATE invoice SET category = 'Operations' WHERE user_id = 'user-sarah' AND category IS NULL;
