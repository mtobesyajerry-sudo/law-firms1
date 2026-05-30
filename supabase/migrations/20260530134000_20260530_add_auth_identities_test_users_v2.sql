/*
  # Add missing auth.identities rows for TEST users (email is generated column)
*/

DO $$
DECLARE
  v_ins_user_id uuid;
  v_acc_user_id uuid;
BEGIN
  SELECT id INTO v_ins_user_id FROM auth.users WHERE email = 'test-insurer@test-verification.invalid';
  SELECT id INTO v_acc_user_id FROM auth.users WHERE email = 'test-accountant@test-verification.invalid';

  IF v_ins_user_id IS NOT NULL THEN
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      v_ins_user_id,
      v_ins_user_id::text,
      'email',
      jsonb_build_object(
        'sub', v_ins_user_id::text,
        'email', 'test-insurer@test-verification.invalid',
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_acc_user_id IS NOT NULL THEN
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      v_acc_user_id,
      v_acc_user_id::text,
      'email',
      jsonb_build_object(
        'sub', v_acc_user_id::text,
        'email', 'test-accountant@test-verification.invalid',
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
