-- Supabase Storage upsert needs SELECT in addition to INSERT and UPDATE.
-- Keep the read permission scoped to the authenticated user's fixed avatar
-- object path so users cannot enumerate another user's storage rows.
drop policy if exists "eokka_avatar_select_own" on storage.objects;
create policy "eokka_avatar_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text
);
