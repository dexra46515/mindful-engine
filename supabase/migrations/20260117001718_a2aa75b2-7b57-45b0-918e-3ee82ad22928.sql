-- Add 'adult' to the app_role enum if not exists
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'adult';

-- To make the current user an admin, run this after signing in:
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin')
-- Or update existing role:
-- UPDATE user_roles SET role = 'admin' WHERE user_id = 'YOUR_USER_ID'