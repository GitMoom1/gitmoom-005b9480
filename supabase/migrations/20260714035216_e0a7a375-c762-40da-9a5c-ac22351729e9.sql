
REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.accept_admin_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_admin_invite(text) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin(uuid) TO authenticated;
