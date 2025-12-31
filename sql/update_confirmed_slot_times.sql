-- SQL function to update time of all confirmed slot instances in a series
CREATE OR REPLACE FUNCTION update_confirmed_slot_times(
  p_series_id UUID,
  p_new_start_time TIME,
  p_new_end_time TIME
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE slot_instance
  SET 
    "start" = (DATE("start") + p_new_start_time)::timestamptz,
    "end" = (DATE("end") + p_new_end_time)::timestamptz,
    version = version + 1
  WHERE 
    series_id = p_series_id
    AND status = 'confirmed';
END;
$$;