CREATE OR REPLACE FUNCTION get_meetings_by_slot_ids(slot_ids text[])
RETURNS SETOF meetings
LANGUAGE sql IMMUTABLE
AS $$
  SELECT * FROM meetings WHERE slots && slot_ids;
$$;
