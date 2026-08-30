REVOKE EXECUTE ON FUNCTION public.apply_plan_entitlements(uuid, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_entitlements(uuid, text, timestamptz, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_repo_readable(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_repo_writable(uuid) FROM PUBLIC, anon;