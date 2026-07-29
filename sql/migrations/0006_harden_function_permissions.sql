REVOKE ALL ON FUNCTION public.handle_sign_up() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_sign_up() FROM anon;
REVOKE ALL ON FUNCTION public.handle_sign_up() FROM authenticated;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;
