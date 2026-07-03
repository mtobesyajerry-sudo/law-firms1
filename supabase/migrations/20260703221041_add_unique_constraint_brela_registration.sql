
ALTER TABLE organizations
ADD CONSTRAINT organizations_brela_registration_unique UNIQUE (brela_registration);
