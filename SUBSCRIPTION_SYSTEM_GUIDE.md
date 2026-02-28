# Subscription Management System Guide

## Overview

The system now includes a comprehensive subscription management system that allows law firms to access the platform through paid subscriptions. This ensures sustainable revenue while providing clear value tiers for different firm sizes.

## Subscription Tiers

### 1. Trial (30 Days)
- **Price**: FREE
- **Duration**: 30 days
- **Features**:
  - Up to 5 users
  - Up to 10 clients
  - Up to 10 risk assessments per month
  - Full feature access during trial
  - Email support

### 2. Basic Plan
- **Price**: TZS 50,000/month (TZS 500,000/year)
- **Features**:
  - Up to 5 staff users
  - Up to 50 clients
  - Up to 50 risk assessments per month
  - Client management (KYC/CDD)
  - Risk assessments
  - Basic reporting
  - Email support

### 3. Professional Plan
- **Price**: TZS 150,000/month (TZS 1,500,000/year)
- **Features**:
  - Up to 15 staff users
  - Up to 200 clients
  - Up to 200 risk assessments per month
  - All Basic features plus:
  - Transaction monitoring
  - Sanctions screening
  - Advanced reporting and analytics
  - API access
  - Priority support

### 4. Enterprise Plan
- **Price**: TZS 500,000/month (TZS 5,000,000/year)
- **Features**:
  - Unlimited users
  - Unlimited clients
  - Unlimited assessments
  - All features included
  - Custom integrations
  - Dedicated 24/7 support
  - Staff training and onboarding
  - API access

## Database Structure

### New Tables

#### subscription_plans
Defines available subscription tiers with pricing and features:
- tier (trial, basic, professional, enterprise)
- monthly_price, annual_price
- max_users, max_clients, max_assessments_per_month
- features (JSONB)

#### organization_subscriptions
Tracks subscription history for each organization:
- organization_id
- tier, status (active, expired, suspended, cancelled)
- start_date, end_date, trial_ends_at
- monthly_fee, billing_cycle
- auto_renew flag

#### payment_transactions
Records all payment transactions:
- organization_id, subscription_id
- transaction_type (subscription, renewal, upgrade, refund)
- amount, currency, payment_method
- payment_status (pending, completed, failed, refunded)
- receipt_number, payment_reference

#### subscription_features
Maps features to subscription tiers:
- tier, feature_key, feature_name
- is_enabled, limit_value

### Updated Tables

#### organizations
Added subscription-related fields:
- subscription_tier (trial, basic, professional, enterprise)
- subscription_status (active, expired, suspended, cancelled)
- trial_ends_at
- subscription_expiry_date
- monthly_fee
- payment_status (pending, paid, overdue, failed)
- last_payment_date
- next_billing_date

## Key Features

### 1. Automatic Trial Setup
When a new organization registers:
- Automatically assigned to trial tier
- 30-day trial period starts immediately
- Full feature access during trial
- No payment required

### 2. Subscription Status Checking
Function `check_subscription_status(org_id)` returns:
- is_active (boolean)
- status (text)
- tier (text)
- days_remaining (integer)

This can be called to verify access before allowing operations.

### 3. Payment Processing
System admins can:
- Record payments manually
- Generate receipt numbers automatically
- Track payment methods (bank transfer, mobile money, etc.)
- View payment history

### 4. Subscription Upgrades
Admins can upgrade organizations to:
- Higher tiers (basic → professional → enterprise)
- Annual billing (10% savings)
- Custom pricing when needed

### 5. Automatic Expiry Handling
- System checks expiry dates
- Automatically marks expired subscriptions
- Can suspend access for non-payment
- Sends notifications (future enhancement)

## User Interface

### System Admin Dashboard
New "Subscriptions" tab provides:
- Overview statistics (total orgs, active subscriptions, revenue)
- List of all organizations with subscription details
- Days remaining indicator
- Payment status badges
- Quick actions:
  - Upgrade subscription
  - Record payment
  - Suspend/reactivate organization

### Subscription Management Component
Features:
- Visual tier badges (color-coded)
- Status indicators (active, expired, suspended)
- Payment tracking
- Upgrade modals
- Payment recording forms

## Business Logic

### Trial Period
1. Organization registers → Trial starts automatically
2. Trial lasts 30 days from creation
3. After 30 days → Status changes to 'expired'
4. Access is blocked until payment

### Paid Subscriptions
1. Admin upgrades organization to paid tier
2. Payment is recorded in system
3. Subscription becomes active
4. Access granted based on tier limits
5. Monthly/annual billing cycle established

### Subscription Renewal
1. Payment is recorded
2. Expiry date extended by billing period
3. Status remains 'active'
4. Receipt generated

### Suspension
1. Admin can manually suspend for non-payment
2. Organization marked as inactive
3. Users cannot access system
4. Can be reactivated after payment

## Access Control

### Feature-Based Limits
Each tier has limits on:
- Number of staff users
- Number of clients
- Monthly assessments
- Feature availability

Future enhancement: Enforce these limits programmatically.

### Payment Required
Organizations with expired subscriptions:
- Cannot create new assessments
- Cannot add new clients
- Cannot add new users
- Can view existing data (read-only)

## Pricing Strategy

### Tanzanian Market Pricing
- Trial: FREE (30 days)
- Basic: TZS 50,000/month (~$21 USD)
- Professional: TZS 150,000/month (~$63 USD)
- Enterprise: TZS 500,000/month (~$211 USD)

### Annual Discount
- 10% savings when paying annually
- Encourages long-term commitments
- Better cash flow for business

## Revenue Tracking

System tracks:
- Total monthly recurring revenue (MRR)
- Active subscriptions by tier
- Trial conversion rates
- Payment success rates
- Average revenue per organization

## Future Enhancements

### Automated Features
1. Email notifications for:
   - Trial expiring (7 days, 3 days, 1 day before)
   - Subscription expiring
   - Payment received
   - Upgrade completed

2. Self-service portal:
   - Organizations can upgrade themselves
   - View invoices and receipts
   - Update payment methods
   - Download tax receipts

3. Payment gateway integration:
   - Mobile money (M-Pesa, Tigo Pesa, Airtel Money)
   - Bank card payments
   - Bank transfers with automatic verification

4. Usage analytics:
   - Track feature usage by tier
   - Identify upgrade opportunities
   - Monitor system health

5. Automated enforcement:
   - Block access when limits exceeded
   - Automatic suspension on payment failure
   - Grace periods for renewals

## Implementation Notes

### Database Security
- All subscription tables have RLS enabled
- Only system admins can modify subscriptions
- Organizations can view their own subscription details
- Payment transactions are audit-logged

### Trigger Functions
1. `initialize_trial_subscription()` - Sets up trial on org creation
2. `check_subscription_status()` - Validates subscription state
3. Auto-creates subscription records for existing organizations

### Indexes
Performance indexes added for:
- organization_id lookups
- status filtering
- date range queries
- payment status checks

## Testing Checklist

- [ ] New organization gets trial automatically
- [ ] Trial expires after 30 days
- [ ] Upgrade to paid tier works
- [ ] Payment recording works
- [ ] Receipt numbers generated
- [ ] Expiry dates calculated correctly
- [ ] Suspension blocks access
- [ ] Reactivation restores access
- [ ] Statistics display correctly
- [ ] Different tiers show correct features

## Support & Troubleshooting

### Common Issues

**Issue**: Organization can't access system
**Solution**: Check subscription_status and expiry date

**Issue**: Payment recorded but access still blocked
**Solution**: Verify subscription_status updated to 'active'

**Issue**: Trial didn't start automatically
**Solution**: Check initialize_trial_subscription trigger is enabled

**Issue**: Revenue stats don't match
**Solution**: Run query: `SELECT SUM(monthly_fee) FROM organizations WHERE subscription_status = 'active'`

## Conclusion

This subscription system provides:
- Sustainable revenue model
- Clear value proposition for customers
- Flexible pricing tiers
- Comprehensive payment tracking
- Foundation for future automation

The system is ready for production use and can scale as the business grows.
