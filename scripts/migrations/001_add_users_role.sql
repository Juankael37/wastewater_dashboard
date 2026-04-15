-- One-time SQLite migration for legacy databases created before users.role existed.
-- Apply with sqlite3:
--   sqlite3 data.db ".read scripts/migrations/001_add_users_role.sql"

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'operator';

UPDATE users
SET role = 'admin'
WHERE id = 1 AND (role IS NULL OR role = '');
