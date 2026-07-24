-- Confirm the argument types first:
-- select pg_get_function_identity_arguments('public.submit_qr_attendance'::regproc);

revoke execute on function public.get_active_presence_code() from anon, authenticated;
revoke execute on function public.rotate_presence_code() from anon, authenticated;
revoke execute on function public.submit_qr_attendance(text, text, double precision, double precision, double precision) from anon, authenticated;

grant execute on function public.get_active_presence_code() to service_role;
grant execute on function public.rotate_presence_code() to service_role;
grant execute on function public.submit_qr_attendance(text, text, double precision, double precision, double precision) to service_role;
