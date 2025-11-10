CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only handle non-admin created users
  IF NEW.raw_user_meta_data->>'created_by_admin' IS NULL THEN
    -- Insert a row into public.profiles with default status and other fields
    -- Use ON CONFLICT to prevent duplicate profile creation
    INSERT INTO public.profiles (
      id, 
      status, 
      first_name, 
      last_name,
      phone_number,
      career,
      payment_receipt_url,
      listing_limit
    )
    VALUES (
      NEW.id, 
      'pending_approval',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'career',
      NEW.raw_user_meta_data->>'payment_receipt_url',
      '{"type": "month", "value": 10}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- By default, assign 'agent' role to new users
    -- Use ON CONFLICT to prevent duplicate role creation
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
