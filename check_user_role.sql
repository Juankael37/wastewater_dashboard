-- Check auth user metadata
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'juankael37@gmail.com';

-- Check profiles table
SELECT id, role FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'juankael37@gmail.com');
