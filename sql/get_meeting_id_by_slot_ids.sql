DROP FUNCTION IF EXISTS get_meeting_id_by_slot_ids(slot_ids text[]);
CREATE OR REPLACE FUNCTION get_meeting_id_by_slot_ids(slot_ids text[])
RETURNS TABLE(
    slot_id text,
    id uuid
)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT s.slot_id, m.id
  FROM unnest(slot_ids) AS s(slot_id)
  JOIN meetings m ON s.slot_id = ANY(m.slots);
$$;
