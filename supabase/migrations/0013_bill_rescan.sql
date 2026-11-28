-- The bill scanner now also reads English invoices/receipts (e.g. Anthropic,
-- PBC) and keeps already-charged invoices as paid. Emails judged under the
-- old Turkish-only rules are forgotten once so the next scan reads them
-- again (at most 15 per user per run), and today's scan may run again.
delete from public.email_scan_log where result = 'not_bill';
update public.google_connections set bills_scanned_at = null;
