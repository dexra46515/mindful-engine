-- Create invite codes table for family linking
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Policies for invite codes
CREATE POLICY "Users can create their own invite codes"
  ON public.invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own invite codes"
  ON public.invite_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = used_by);

CREATE POLICY "Users can update codes they created or are using"
  ON public.invite_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR (used_by IS NULL AND expires_at > now()));

-- Add index for code lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);

-- Allow users to view own risk history (missing policy)
CREATE POLICY "Users can view own risk history"
  ON public.risk_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);