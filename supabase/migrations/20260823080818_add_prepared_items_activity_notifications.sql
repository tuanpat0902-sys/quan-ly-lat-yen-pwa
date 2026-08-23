drop trigger if exists ly_activity_event_trigger on public.ly_prepared_items;

create trigger ly_activity_event_trigger
after insert or update or delete on public.ly_prepared_items
for each row execute function ly_private.ly_capture_activity_event();
