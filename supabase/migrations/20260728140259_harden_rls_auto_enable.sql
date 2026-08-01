-- Supabase creates this helper as a SECURITY DEFINER function. It is used
-- internally and must not be exposed as an RPC to public API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
