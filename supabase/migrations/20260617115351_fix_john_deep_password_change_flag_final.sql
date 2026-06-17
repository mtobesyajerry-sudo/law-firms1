-- John Deep (jd@bowerassociates.co.tz) still has password_change_required = true
-- Clear it so he can log in without being forced through password reset
UPDATE user_profiles
SET password_change_required = false
WHERE email = 'jd@bowerassociates.co.tz';
