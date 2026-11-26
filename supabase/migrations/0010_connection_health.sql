-- When Google stops accepting the stored refresh token (revoked, expired:
-- in Testing mode Google expires them after 7 days), remember it so the
-- app can ask the user to reconnect. Cleared on the next sign-in.
alter table public.google_connections add column broken_at timestamptz;
