-- Allow anyone to view invite codes for validation during signup
-- This is needed because users aren't authenticated yet when validating codes
CREATE POLICY "Anyone can view invite codes for validation"
ON public.invite_codes
FOR SELECT
TO anon, authenticated
USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own invite codes" ON public.invite_codes;