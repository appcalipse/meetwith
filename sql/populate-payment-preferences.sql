BEGIN;

-- Insert default payment_preferences for accounts that don't have any.
-- Adjust column list and default values as needed.
INSERT INTO public.payment_preferences (
    owner_account_address,
    notification
)
SELECT
    a.address AS owner_account_address,
    ARRAY['send-tokens','receive-tokens']::"AccountPreferenceNotification"[] AS notification

FROM public.accounts a
         LEFT JOIN public.payment_preferences pp
                   ON pp.owner_account_address = a.address
WHERE pp.owner_account_address IS NULL
-- Optional: limit/offset if you want to batch
-- LIMIT 1000
-- OFFSET 0
ON CONFLICT (owner_account_address) DO NOTHING;

COMMIT;