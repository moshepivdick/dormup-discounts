-- TEMPORARY: Disable trigger for testing isolation mode
-- This allows us to verify if the trigger is causing the 500 error
-- 
-- To re-enable: ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Log that trigger is disabled
DO $$
BEGIN
  RAISE NOTICE 'Trigger on_auth_user_created has been DISABLED for testing';
  RAISE NOTICE 'To re-enable: ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;';
END $$;


