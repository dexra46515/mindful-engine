-- Allow users to insert their own role (for onboarding)
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Prevent users from having multiple roles
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles (user_id);