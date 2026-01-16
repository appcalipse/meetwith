-- SQL function to update time of all confirmed slot instances in a series by offset
CREATE OR REPLACE FUNCTION update_slot_instances_times(
  p_series_id UUID,
  p_start_offset INTERVAL,
  p_end_offset INTERVAL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE slot_instance
  SET 
    "start" = "start" + p_start_offset,
    "end" = "end" + p_end_offset,
    version = version + 1
  WHERE 
    series_id = p_series_id
    AND status = 'confirmed';
END;
$$;