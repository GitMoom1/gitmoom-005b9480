
-- Tighten anon insert: basic shape validation instead of blanket true
DROP POLICY IF EXISTS "Anyone can insert a lead" ON public.leads;
CREATE POLICY "Anyone can insert a lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 320
    AND position('@' in email) > 1
    AND (source IS NULL OR char_length(source) <= 60)
  );

-- Restrict has_role() so only the DB itself (through RLS policies) can use it
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;
