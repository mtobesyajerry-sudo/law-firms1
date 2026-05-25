/*
  # Add manual_admin to subscription_payments payment method constraint

  The manual_admin method is needed for admin-recorded payments.
*/

ALTER TABLE subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_payment_method_check;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_payment_method_check
  CHECK (payment_method IN ('mpesa', 'mixx_by_yas', 'airtel_money', 'halopesa', 'bank_transfer_crdb', 'manual_admin'));
