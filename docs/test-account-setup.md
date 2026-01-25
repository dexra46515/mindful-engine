# Apple Review Test Account Setup

## Overview

This guide explains how to set up test accounts for Apple's App Store review team.

---

## Step 1: Create Test Accounts

Since Supabase Auth manages user creation, you need to create the accounts through the app:

### Parent Account
1. Go to `/auth` in your app
2. Click "Sign Up"
3. Enter:
   - **Email:** `parent-test@example.com`
   - **Password:** `TestDemo2025!`
   - **Invite Code:** `TEST-2025-DEMO`
4. Select role: **Parent**
5. Complete signup

### Youth Account
1. Go to `/auth` in your app
2. Click "Sign Up"
3. Enter:
   - **Email:** `youth-test@example.com`
   - **Password:** `TestDemo2025!`
   - **Invite Code:** `TEST-2025-DEMO`
4. Select role: **Youth**
5. Complete signup

---

## Step 2: Link the Accounts

After creating both accounts, run this SQL in the Supabase dashboard (SQL Editor) or via the CLI:

```sql
-- Get the user IDs (run this first to find the IDs)
SELECT 
  au.id,
  au.email,
  ur.role
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email IN ('parent-test@example.com', 'youth-test@example.com');

-- Then insert the family link (replace the UUIDs with actual IDs from above)
INSERT INTO public.family_links (parent_id, youth_id, is_active)
VALUES (
  'PARENT_UUID_HERE',  -- Replace with parent's user ID
  'YOUTH_UUID_HERE',   -- Replace with youth's user ID
  true
);

-- Create profiles if not already created
INSERT INTO public.profiles (user_id, display_name)
VALUES 
  ('PARENT_UUID_HERE', 'Test Parent'),
  ('YOUTH_UUID_HERE', 'Emma (Test Youth)')
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Create a default policy for the youth
INSERT INTO public.policies (
  owner_id, 
  target_user_id, 
  name, 
  daily_limit_minutes, 
  session_limit_minutes,
  bedtime_start,
  bedtime_end,
  is_active
)
VALUES (
  'PARENT_UUID_HERE',
  'YOUTH_UUID_HERE',
  'Default Policy for Emma',
  120,  -- 2 hours daily limit
  30,   -- 30 minute session limit
  '21:00',  -- 9 PM bedtime start
  '07:00',  -- 7 AM bedtime end
  true
);
```

---

## Step 3: Verify Setup

Run this query to verify everything is set up correctly:

```sql
SELECT 
  'Parent' as account_type,
  au.email,
  ur.role,
  p.display_name
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE au.email = 'parent-test@example.com'

UNION ALL

SELECT 
  'Youth' as account_type,
  au.email,
  ur.role,
  p.display_name
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE au.email = 'youth-test@example.com';

-- Verify family link
SELECT 
  fl.id as link_id,
  parent.email as parent_email,
  youth.email as youth_email,
  fl.is_active
FROM public.family_links fl
JOIN auth.users parent ON parent.id = fl.parent_id
JOIN auth.users youth ON youth.id = fl.youth_id;
```

---

## Automated Setup Script

For convenience, here's a complete script you can run after creating the accounts:

```sql
DO $$
DECLARE
  v_parent_id uuid;
  v_youth_id uuid;
BEGIN
  -- Get parent ID
  SELECT id INTO v_parent_id 
  FROM auth.users 
  WHERE email = 'parent-test@example.com';
  
  -- Get youth ID
  SELECT id INTO v_youth_id 
  FROM auth.users 
  WHERE email = 'youth-test@example.com';
  
  -- Check if both accounts exist
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Parent account not found. Please create parent-test@example.com first.';
  END IF;
  
  IF v_youth_id IS NULL THEN
    RAISE EXCEPTION 'Youth account not found. Please create youth-test@example.com first.';
  END IF;
  
  -- Create profiles
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_parent_id, 'Test Parent')
  ON CONFLICT (user_id) DO UPDATE SET display_name = 'Test Parent';
  
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_youth_id, 'Emma (Test Youth)')
  ON CONFLICT (user_id) DO UPDATE SET display_name = 'Emma (Test Youth)';
  
  -- Create family link
  INSERT INTO public.family_links (parent_id, youth_id, is_active)
  VALUES (v_parent_id, v_youth_id, true)
  ON CONFLICT DO NOTHING;
  
  -- Create policy
  INSERT INTO public.policies (
    owner_id, 
    target_user_id, 
    name, 
    daily_limit_minutes, 
    session_limit_minutes,
    bedtime_start,
    bedtime_end,
    is_active
  )
  VALUES (
    v_parent_id,
    v_youth_id,
    'Default Policy for Emma',
    120,
    30,
    '21:00',
    '07:00',
    true
  )
  ON CONFLICT DO NOTHING;
  
  -- Create initial risk state for youth
  INSERT INTO public.risk_states (user_id, current_level, score)
  VALUES (v_youth_id, 'low', 15)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Test accounts linked successfully!';
  RAISE NOTICE 'Parent ID: %', v_parent_id;
  RAISE NOTICE 'Youth ID: %', v_youth_id;
END $$;
```

---

## Test Account Credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Parent | parent-test@example.com | TestDemo2025! | parent |
| Youth | youth-test@example.com | TestDemo2025! | youth |

**Invite Code:** `TEST-2025-DEMO` (never expires)

---

## For Apple Review Notes

Include this in your App Store Connect review notes:

```
Test Accounts for Review:

Parent Account:
- Email: parent-test@example.com
- Password: TestDemo2025!
- Role: Parent (manages youth account)

Youth Account:
- Email: youth-test@example.com
- Password: TestDemo2025!
- Role: Youth (monitored by parent)

The parent account has pre-configured policies for the youth account.
To test the full parental consent flow, visit /demo in the app.

Test invite code for new signups: TEST-2025-DEMO
```

---

*Last Updated: January 2025*
