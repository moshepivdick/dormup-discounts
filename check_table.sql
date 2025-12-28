-- Check if email_verification_tokens table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'email_verification_tokens'
);

-- If table exists, show its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'email_verification_tokens'
ORDER BY ordinal_position;

