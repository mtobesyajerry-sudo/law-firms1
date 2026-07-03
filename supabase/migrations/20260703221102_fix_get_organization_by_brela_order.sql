
CREATE OR REPLACE FUNCTION public.get_organization_by_brela(brela_number text)
 RETURNS TABLE(id uuid, name text, contact_email text, user_count integer, can_accept_users boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.contact_email,
    (SELECT COUNT(*)::INTEGER FROM user_profiles up
     WHERE up.organization_id = o.id AND up.role = 'management') AS user_count,
    (SELECT COUNT(*) < 3 FROM user_profiles up
     WHERE up.organization_id = o.id AND up.role = 'management') AS can_accept_users
  FROM organizations o
  WHERE o.brela_registration = brela_number
  ORDER BY o.created_at ASC
  LIMIT 1;
END;
$function$;
