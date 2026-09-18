-- Reconnecting Facebook creates a new facebook_connections row. With
-- uniqueness scoped to (connection_id, page_id), that produced a second
-- facebook_pages row for the same real Page — splitting its post history
-- and silently dropping the user's is_selected choice.
--
-- Scope uniqueness to the business instead, so a reconnect upserts the
-- existing Page row (new token, new connection_id) and keeps everything
-- that points at it intact.

alter table facebook_pages
  drop constraint facebook_pages_connection_id_page_id_key;

alter table facebook_pages
  add constraint facebook_pages_business_id_page_id_key unique (business_id, page_id);

-- The active-connection lookup runs on every Facebook Pages page load.
create index idx_fb_connections_business_status
  on facebook_connections(business_id, status);
