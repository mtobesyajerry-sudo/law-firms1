-- Set max_users based on subscription_tier for all existing organizations
UPDATE organizations
SET max_users = CASE
  WHEN subscription_tier = 'small_firm'  THEN 12
  WHEN subscription_tier = 'medium_firm' THEN 30
  WHEN subscription_tier = 'large_firm'  THEN NULL
  ELSE max_users
END;

-- Also set subscription_expiry_date from trial_ends_at where it is null but trial_ends_at is set
UPDATE organizations
SET subscription_expiry_date = trial_ends_at
WHERE subscription_expiry_date IS NULL AND trial_ends_at IS NOT NULL;
