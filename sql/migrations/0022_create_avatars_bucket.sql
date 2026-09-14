-- Profile images are displayed through public URLs, while writes are limited
-- to the authenticated user's own object path.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "eokka_avatar_insert_own" on storage.objects;
create policy "eokka_avatar_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text
);

drop policy if exists "eokka_avatar_update_own" on storage.objects;
create policy "eokka_avatar_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text
);

drop policy if exists "eokka_avatar_delete_own" on storage.objects;
create policy "eokka_avatar_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name = (select auth.uid())::text
);
