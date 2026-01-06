-- Compound index for main query filter
CREATE INDEX CONCURRENTLY idx_slot_instance_account_time
ON slot_instance (account_address, start, "end")
WHERE account_address IS NOT NULL;

-- Foreign key index
CREATE INDEX CONCURRENTLY idx_slot_instance_series_id
ON slot_instance (series_id);

-- Series lookup index
CREATE INDEX CONCURRENTLY idx_slot_series_id
ON slot_series (id);

-- Slot lookup index
CREATE INDEX CONCURRENTLY idx_slot_series_slot_id
ON slot_series (slot_id);

-- Array search index (most likely culprit for slowness)
CREATE INDEX CONCURRENTLY idx_meetings_slots_gin
ON meetings USING GIN (slots);

-- Alternative if above doesn't work:
CREATE INDEX CONCURRENTLY idx_meetings_slots_btree
ON meetings USING BTREE (slots);

CREATE INDEX CONCURRENTLY idx_slot_series_id_slot
ON slot_series (id) INCLUDE (slot_id, account_address);
