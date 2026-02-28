# Tanzania Law Firm Registration & Onboarding Implementation

## Overview

Fully implemented Tanzania-specific law firm registration and onboarding system with automatic tier assignment based on risk profiles.

## Implementation Summary

### 1. Database Schema

**Migration:** `update_law_firm_registration_complete_system.sql`

#### law_firm_profiles Table
Created comprehensive firm profile tracking with:
- Firm size classification (1-3, 4-10, 11-25, 26-50, More than 50)
- Practice areas (stored as array)
- Client profile indicators (PEPs, foreign clients, multinationals, etc.)
- Risk exposure factors (client funds, beneficial ownership, tax structuring, etc.)
- Geographic exposure indicators (cross-border work, high-risk jurisdictions, offshore structures)
- Automatic tier assignment (Tier 1, 2, or 3)
- Onboarding completion tracking

#### Tier Assignment Logic
Automatic calculation via `calculate_law_firm_tier()` function:

**Tier 3 (High Risk):**
- Anti-Gaming Safeguard: PEPs + cross-border work + structuring services
- More than 50 advocates
- Serves multinationals or PEPs
- Beneficial ownership + cross-border work
- Offshore structures or high-risk jurisdictions

**Tier 1 (Low Risk):**
Must meet ALL criteria:
- 1-3 advocates
- No foreign clients or PEPs
- No client fund handling
- No beneficial ownership services
- No cross-border work

**Tier 2 (Medium Risk):**
Default for everything else

### 2. Registration Form (Auth.jsx)

#### First User (Admin)
Simple registration:
- Full name
- Email
- Password
- Automatic admin role assignment

#### Law Firm Registration
Comprehensive signup form matching Tanzania specifications:

**Part 1: Law Firm Information**
- Law firm name (full registered name)
- TLS Registration Number (optional)
- Business Registration Number - BRELA (required)
- Firm email address (official email)

**Part 2: Contact Person**
- Full name
- Designation (Partner/Associate/Compliance Officer/Administrator)
- Mobile number (for authentication and alerts)

**Part 3: Password Setup**
- Strong password (minimum 8 characters)
- Password confirmation
- Encrypted storage in registration request

**Part 4: Sector Confirmation**
- Checkbox: "We confirm that we are a law firm or advocate licensed in Tanzania"

**Part 5: Consent & Compliance**
Required checkboxes:
- Terms and Conditions acceptance
- Privacy Policy acceptance
- Personal Data Protection Act consent
- AML/CFT risk-based compliance tools consent

**Part 6: Security Assurance**
Displayed message:
"This platform applies encryption, strict access control, and institutional data isolation. All client information remains confidential and is accessible only to authorised users within your firm."

### 3. Post-Signup Onboarding Component

**Component:** `LawFirmOnboarding.jsx`

5-step guided setup triggered after first login:

**Step 1: Firm Size**
- Number of advocates (1-3, 4-10, 11-25, 26-50, More than 50)

**Step 2: Practice Areas**
Multi-select:
- Corporate and commercial law
- Real estate and conveyancing
- Litigation and dispute resolution
- Banking and finance
- Tax and structuring
- Insolvency and restructuring
- Trust and private client services
- NGO and charity advisory
- Cross-border transactions
- Investment and mergers & acquisitions

**Step 3: Client Profile**
Multi-select checkboxes:
- High-net-worth individuals
- Politically exposed persons
- Foreign clients
- Multinational corporations
- Financial institutions
- DNFBPs
- NGOs receiving foreign funding

**Step 4: Risk Exposure**
Multi-select checkboxes:
- Handle client funds or escrow accounts
- Act as company secretary or trustee
- Assist in company formation
- Assist in beneficial ownership structuring
- Provide nominee or intermediary services
- Provide tax structuring
- Engage in cross-border asset structuring

**Step 5: Geographic Exposure**
Multi-select checkboxes:
- Conduct cross-border work
- Engage with high-risk jurisdictions
- Use foreign intermediaries
- Work with offshore structures

### 4. Automatic Tier Assignment

Tier calculated automatically on profile completion via database trigger.

**Anti-Gaming Safeguard:**
If PEP exposure + cross-border work + structuring services = Automatic Tier 3

**User Experience:**
- Users never see internal tier classification
- System shows: "Your firm profile has been configured"
- Modules activated based on practice risk profile

### 5. Security Features

**Registration Security:**
- Password encrypted using CryptoJS before storage
- All consents tracked with timestamps
- Mobile number for future 2FA implementation
- Sector confirmation requirement

**Data Protection:**
- Row Level Security (RLS) enabled on all tables
- Organization-based data isolation
- Admin-only approval workflow
- Encrypted password storage in pending registrations

### 6. Admin Approval Workflow

**Registration Requests:**
- Stored in `law_firm_registrations` table
- Status: pending/approved/rejected
- Admin reviews via Management Dashboard
- Upon approval:
  - User account created
  - Organization created
  - Firm profile initialized
  - User receives email notification

## User Flow

### New Law Firm Registration

1. **Visit Registration Page**
   - User clicks "Register" tab
   - System checks if first user (admin setup) or law firm registration

2. **Complete Registration Form**
   - Fill law firm information
   - Provide registration details (TLS, BRELA)
   - Add contact person details
   - Create password
   - Accept all required consents

3. **Submit Registration**
   - Request stored with encrypted password
   - Status set to "pending"
   - Confirmation message displayed

4. **Admin Approval**
   - Admin reviews request in Management Dashboard
   - Approves or rejects with reason

5. **First Login**
   - User receives approval notification
   - Logs in with credentials
   - Onboarding wizard launches automatically

6. **Complete Onboarding** (5 steps)
   - Firm size selection
   - Practice areas
   - Client profile
   - Risk exposure
   - Geographic exposure

7. **Automatic Tier Assignment**
   - System calculates tier based on responses
   - No manual downgrade allowed
   - Tier stored internally (not shown to user)

8. **Access Dashboard**
   - User redirected to appropriate dashboard
   - Modules activated based on tier and profile

## Files Modified/Created

### Created Files:
- `src/components/LawFirmOnboarding.jsx` - Post-signup onboarding wizard
- `supabase/migrations/update_law_firm_registration_complete_system.sql` - Database schema

### Modified Files:
- `src/components/Auth.jsx` - Updated registration form
- `src/components/ManagementDashboard.jsx` - Fixed table reference

## Benefits

### For Tanzania Law Firms:
- Short, professional signup process
- Builds trust with security assurance
- Confidential data handling
- Low resistance to adoption
- TLS-friendly compliance approach

### For Regulators:
- Risk-based approach aligned with FATF
- Automatic tier classification
- Anti-gaming safeguards
- Comprehensive audit trail

### For System:
- Scalable across Africa
- Supports future upselling
- Clear upgrade paths
- Modular activation based on risk

## Technical Notes

### Password Security:
- Minimum 8 characters required
- Encrypted using CryptoJS with time-based key
- Never stored in plain text
- Temporary storage only during approval process

### Data Validation:
- BRELA registration number required
- All consents must be accepted
- Mobile number format validation
- Email format validation

### RLS Policies:
- Anonymous users: Can only insert registration requests
- Authenticated users: Can view own organization profile
- Admin users: Can view all registrations and profiles
- Organization members: Can view and update own profile

## Next Steps

### Integration Points:
1. Email notification system for approval/rejection
2. SMS verification for mobile numbers
3. Two-factor authentication setup
4. Document upload for TLS/BRELA certificates
5. Module activation based on tier assignment

### Future Enhancements:
1. Payment integration for subscription tiers
2. Automatic renewal reminders
3. Risk profile periodic review
4. Tier re-assessment based on activity
5. Multi-language support (Swahili)

## Testing Checklist

- [ ] First user admin registration
- [ ] Law firm registration request submission
- [ ] Admin approval workflow
- [ ] Onboarding wizard completion
- [ ] Automatic tier assignment
- [ ] Tier 1 assignment (low risk)
- [ ] Tier 2 assignment (medium risk)
- [ ] Tier 3 assignment (high risk)
- [ ] Anti-gaming safeguard trigger
- [ ] Data isolation between organizations
- [ ] Password encryption
- [ ] Consent tracking
- [ ] Mobile number validation
- [ ] Email validation
- [ ] Security assurance display
