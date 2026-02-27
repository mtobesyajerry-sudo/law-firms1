# CLIENT INFORMATION PAGE - COMPLETE SPECIFICATIONS

## OVERVIEW

This document provides complete specifications for the KYC Client Information/Details page, including layout, components, styling, data structures, and interactions. This page is the central hub for managing individual client KYC/CDD information with three-tier due diligence support.

---

## PAGE ARCHITECTURE

### Route
- **Path:** `/kyc-client/:clientId`
- **Component:** `KYCClientDetails.jsx`
- **Access:** Authenticated users with organization access to the client

### Data Dependencies
- **Primary Table:** `kyc_clients`
- **Related Tables:**
  - `edd_documents` (for Enhanced DD tracking)
  - `edd_document_types` (for document type definitions)
  - `client_documents` (for uploaded documents)
  - `document_types` (for document requirements)

---

## PAGE LAYOUT STRUCTURE

### 1. CORPORATE HEADER

**Design:**
- Full-width dark gradient header (navy blue to slate blue)
- Gold accent border at bottom (3px solid #d4af37)
- Drop shadow for depth

**Components:**
- **Back Button** (left): Gold border button with arrow
- **Client Name** (center-left): Large white text with shadow
- **Client Type & PEP Status** (subtitle): Gold text with bullet separators
- **Risk Badge** (right): Colored badge showing risk level with gradient background

**Styling Details:**
```css
Header Background: linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)
Border Bottom: 3px solid #d4af37
Padding: 24px 32px
Box Shadow: 0 4px 20px rgba(0,0,0,0.3)
```

**Example:**
```
← Back    John Smith (Individual Client • PEP Status)    [HIGH RISK]
```

---

### 2. CONTENT AREA

**Container Specs:**
- Max width: 1200px
- Centered with auto margins
- 32px padding
- Background: Linear gradient from #f8f9fa to #e8eaed

---

### 3. DD TRIGGERS ALERT (Conditional)

**When to Show:**
- Only displays when Enhanced DD triggers are detected
- Positioned above tabs

**Components:**
- Warning icon (⚠️)
- Title: "Enhanced Due Diligence Triggers Detected"
- Description of trigger count
- Bulleted list of specific triggers
- "Upgrade to Enhanced DD" button (if not already enhanced)

**Styling:**
```css
Background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)
Border: 2px solid #f59e0b
Border Radius: 12px
Padding: 20px 24px
Box Shadow: 0 4px 12px rgba(245, 158, 11, 0.2)
```

**Trigger Detection Logic:**
From `utils/documentUtils.js`:
- PEP status detected
- High/Very High risk rating
- High-risk jurisdiction
- Adverse media findings
- Sanctions screening hits
- Complex ownership structures

---

### 4. TAB NAVIGATION

**Tab Structure:**
1. **Overview** (Always visible)
2. **Risk Assessment** (Always visible)
3. **Documents** (Always visible)
4. **SOF/SOW Templates** (Standard & Enhanced DD only)
5. **EDD Templates** (Enhanced DD only)

**Tab Styling:**
```css
Container:
  Background: white
  Padding: 8px
  Border Radius: 12px
  Border: 1px solid #e2e8f0
  Box Shadow: 0 2px 8px rgba(0,0,0,0.1)
  Gap: 8px

Individual Tab:
  Flex: 1
  Padding: 14px 20px
  Background: transparent
  Border: none
  Border Radius: 8px
  Font Size: 14px
  Font Weight: 600
  Color: #64748b (inactive)
  Cursor: pointer
  Transition: all 0.3s ease

Active Tab:
  Background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)
  Color: #0a1929
  Box Shadow: 0 4px 12px rgba(212, 175, 55, 0.4)
```

---

### 5. TAB CONTENT AREA

**Container:**
```css
Background: white
Border Radius: 16px
Padding: 28px
Border: 2px solid #d4af37
Box Shadow: 0 4px 20px rgba(0,0,0,0.15)
```

---

## TAB 1: OVERVIEW

### Layout Structure

Two-column responsive grid:
```css
Display: grid
Grid Template Columns: repeat(auto-fit, minmax(450px, 1fr))
Gap: 24px
```

---

### LEFT COLUMN

#### A. BASIC INFORMATION CARD

**Icon:** 👤

**Fields Displayed:**
- Client Type (Individual/Legal Entity)
- ID Number
- Date of Birth (Individual) / Incorporation Date (Legal Entity)
- Nationality
- Country of Residence
- Client Status (Active/Inactive/Suspended/Rejected)

**Field Layout:**
```
Label (left)          Value (right)
-------------------------
Client Type:          Individual
ID Number:           ABC123456
Date of Birth:       01/15/1985
```

**Styling:**
```css
Card:
  Background: white
  Border: 2px solid #d4af37
  Border Radius: 12px
  Padding: 20px
  Box Shadow: 0 2px 12px rgba(0,0,0,0.08)

Title:
  Font Size: 16px
  Font Weight: 700
  Color: #0a1929
  Border Bottom: 2px solid #d4af37
  Padding Bottom: 12px
  Margin Bottom: 16px

Row:
  Display: flex
  Justify Content: space-between
  Padding: 12px 0
  Border Bottom: 1px solid #f3f4f6

Label:
  Font Size: 13px
  Color: #6b7280
  Font Weight: 600

Value:
  Font Size: 14px
  Color: #1f2937
  Font Weight: 500
  Text Align: right
  Max Width: 60%
```

---

#### B. BUSINESS & FINANCIAL CARD

**Icon:** 💼

**Fields Displayed:**
- Business Activity
- Source of Funds
- Source of Wealth
- Estimated Annual Turnover
- Purpose of Relationship

**Same styling structure as Basic Information Card**

---

### RIGHT COLUMN

#### A. DUE DILIGENCE & RISK PROFILE CARD

**Icon:** 🔒

**Header Components:**
- Title: "Due Diligence & Risk Profile"
- DD Level Badge (Simplified/Standard/Enhanced)

**Main Content:**

1. **DD Level Selector**
   - Dropdown to change DD level
   - Options: Simplified, Standard, Enhanced
   - Confirmation dialog on change

2. **Risk Rating Badge**
   - Color-coded badge (Low/Medium/High/Very High)
   - Colors:
     - Low: #10b981 (green)
     - Medium: #f59e0b (amber)
     - High: #ef4444 (red)
     - Very High: #7f1d1d (dark red)

3. **DD Level Description**
   - Text box explaining the current DD level
   - Light gray background with border

4. **Key Requirements Section**
   - Title: "Key Requirements:"
   - Bulleted list of features/requirements
   - Green bullet points (•)

5. **DD Status Checklist** (Conditional)

**For Enhanced DD:**
Shows `EnhancedDDStatusSection` component with:
- Core Requirements section:
  - Source of Funds (✓ or ○)
  - Source of Wealth (✓ or ○)
  - Senior Approval (✓ or ○)
- Screening & Monitoring section:
  - PEP Declaration (✓ or ○)
  - Public Records Screening (✓ or ○)

**For Standard DD:**
Shows `StandardDDStatusSection` component with:
- Core Requirements section:
  - Source of Funds (✓ or ○)

**Status Icons:**
- ✓ (Completed): Green background (#d1fae5), dark green text (#065f46)
- ○ (Pending): Amber background (#fef3c7), dark amber text (#92400e)

**Checklist Styling:**
```css
Container:
  Background: white
  Border: 1px solid #e5e7eb
  Border Radius: 8px
  Padding: 16px
  Margin Top: 16px

Header:
  Display: flex
  Justify Content: space-between
  Margin Bottom: 16px
  Padding Bottom: 12px
  Border Bottom: 2px solid #e5e7eb

Header Title:
  Font Size: 13px
  Font Weight: 700
  Color: #374151
  Text Transform: uppercase
  Letter Spacing: 0.5px

Pending Badge:
  Font Size: 11px
  Font Weight: 700
  Padding: 4px 10px
  Border Radius: 12px
  Background: #fef3c7
  Color: #92400e
  Border: 1px solid #fde68a

Grid:
  Display: grid
  Grid Template Columns: repeat(auto-fit, minmax(250px, 1fr))
  Gap: 16px

Status Item:
  Display: flex
  Align Items: center
  Gap: 12px
  Padding: 10px
  Background: #fafafa
  Border Radius: 6px

Status Icon:
  Width: 28px
  Height: 28px
  Border Radius: 50%
  Display: flex
  Align Items: center
  Justify Content: center
  Font Size: 14px
  Font Weight: 700
  Border: 2px solid
  Flex Shrink: 0
```

**For Simplified DD:**
Shows justification section with:
- Yellow warning box if no justification provided
- Or text box showing the justification

---

#### B. CONTINUOUS MONITORING CARD

**Icon:** 🔄

**Fields Displayed:**
- Review Frequency (Weekly/Monthly/Quarterly/Semi-Annual/Annual)
- Next Review Date (with days until or OVERDUE warning)
- Last Review Date
- Monitoring Status (Active/Overdue/Suspended/Closed)

**Date Display Logic:**
- Green text for future dates
- Red text for overdue dates
- Shows countdown: "(in X days)"
- Shows warning: "⚠️ OVERDUE"

**Status Colors:**
- Active: #10b981 (green)
- Overdue: #ef4444 (red)
- Suspended: #f59e0b (amber)
- Closed: #6b7280 (gray)

---

## TAB 2: RISK ASSESSMENT

### Layout

Single card with risk details:

**Components:**
1. **Risk Score Display**
   - Large centered number (48px font)
   - Label above: "Overall Risk Score"
   - Risk rating badge below

2. **PEP Status Alert** (if applicable)
   - Yellow background
   - Text: "This client is a Politically Exposed Person"

3. **Additional Risk Information**
   - Sanctions Screening Result
   - Adverse Media Findings

**Styling:**
```css
Risk Score Display:
  Text Align: center
  Padding: 32px
  Background: white
  Border Radius: 8px
  Margin Bottom: 24px

Risk Score Value:
  Font Size: 48px
  Font Weight: 700
  Color: #1f2937
  Margin Bottom: 16px

Risk Rating Badge:
  Display: inline-block
  Padding: 8px 24px
  Border Radius: 999px
  Color: white
  Font Size: 16px
  Font Weight: 600
  Background: [Risk Color]

PEP Alert:
  Padding: 12px
  Background: #fef3c7
  Border: 1px solid #f59e0b
  Border Radius: 6px
  Color: #92400e
  Font Size: 14px
  Margin Bottom: 16px
```

---

## TAB 3: DOCUMENTS

**Component:** `ClientDocumentManagement`

### Layout Structure

1. **Security Notice Banner**
   - Icon: 🔒
   - Title: "Secure Document Handling"
   - Yellow background (#fef3c7) with orange border
   - Explains secure document features

2. **Required Documents Checklist**
   - Title with DD level badge
   - Grid layout by category

### Category Grid

**Categories:**
- Identity (Blue: #3b82f6)
- Address (Green: #10b981)
- Regulatory (Purple: #8b5cf6)
- Financial (Amber: #f59e0b)

**Category Column Structure:**
```
┌─────────────────────────┐
│   CATEGORY HEADER       │ ← Colored background
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Document Item       │ │
│ │ [Required Badge]    │ │
│ │ Description         │ │
│ │ [Template Notice]   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Document Item       │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Document Item Components:**
- Title (bold, 14px)
- Required badge (if mandatory)
- Description (12px gray text)
- Template notice (green box) if template available
- Validation rules (blue box) if applicable

**Styling:**
```css
Categories Grid:
  Display: grid
  Grid Template Columns: repeat(auto-fit, minmax(240px, 1fr))
  Gap: 20px

Category Column:
  Border: 1px solid #e5e7eb
  Border Radius: 12px
  Overflow: hidden
  Background: white

Category Header:
  Padding: 12px 16px
  Color: white
  Font Size: 14px
  Font Weight: 700
  Text Transform: uppercase
  Text Align: center
  Letter Spacing: 0.5px
  Background: [Category Color]

Document Item:
  Padding: 12px
  Background: #fafafa
  Border Radius: 8px
  Border: 1px solid #e5e7eb
  Margin: 12px 16px

Template Notice:
  Margin Top: 8px
  Padding: 8px 12px
  Background: #d1fae5
  Border: 1px solid #6ee7b7
  Border Radius: 6px
  Display: flex
  Align Items: center
  Gap: 8px
  Font Size: 12px
  Color: #065f46
```

3. **Document Collection Guidelines**
   - Blue info box at bottom
   - Bulleted list of best practices

---

## TAB 4: SOF/SOW TEMPLATES

**Component:** `SOFSOWTemplates`

Provides printable templates for:
- Source of Funds Declaration
- Source of Wealth Documentation

Features:
- Print functionality
- Pre-filled with client information
- Professional formatting

---

## TAB 5: EDD TEMPLATES

**Component:** `EDDDocumentTemplates`

Provides printable templates for Enhanced DD:
- PEP Declaration
- Enhanced DD Questionnaire
- Public Records Search Results
- Senior Management Approval
- Ongoing Monitoring Checklist

Features:
- Print functionality
- Client information pre-populated
- Tracking of completion status

---

## COLOR PALETTE

### Primary Colors
```css
Navy Blue (Primary):     #0a1929
Slate Blue (Secondary):  #1a2f45
Gold (Accent):          #d4af37
Light Gold:             #f4d03f
```

### Risk Colors
```css
Low Risk:               #10b981 (Green)
Medium Risk:            #f59e0b (Amber)
High Risk:              #ef4444 (Red)
Very High Risk:         #7f1d1d (Dark Red)
```

### Status Colors
```css
Active:                 #10b981 (Green)
Inactive:               #ef4444 (Red)
Suspended:              #f59e0b (Amber)
Pending:                #3b82f6 (Blue)
```

### Document Category Colors
```css
Identity:               #3b82f6 (Blue)
Address:                #10b981 (Green)
Financial:              #f59e0b (Amber)
Corporate:              #8b5cf6 (Purple)
Regulatory:             #ec4899 (Pink)
```

### Background Colors
```css
Page Background:        linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)
Card Background:        #ffffff (White)
Light Gray:             #f8f9fa
Very Light Gray:        #fafafa
```

### Border Colors
```css
Primary Border:         #d4af37 (Gold)
Light Border:           #e5e7eb
Medium Border:          #e2e8f0
```

### Text Colors
```css
Primary Text:           #0a1929 (Navy)
Secondary Text:         #1f2937 (Dark Gray)
Muted Text:             #6b7280 (Gray)
Light Text:             #9ca3af (Light Gray)
```

---

## DATA STRUCTURE

### Client Object Schema

```typescript
interface KYCClient {
  // Identity
  id: uuid;
  organization_id: uuid;
  client_type: 'individual' | 'corporate' | 'trust' | 'partnership' | 'other';
  client_name: string;
  client_id_number?: string;
  date_of_birth?: Date;
  incorporation_date?: Date;
  nationality?: string;
  country_of_residence?: string;
  country_of_incorporation?: string;

  // Business
  business_activity?: string;
  estimated_annual_turnover?: string;
  purpose_of_relationship?: string;
  legal_service_type?: string;
  expected_transaction_volume?: string;
  economic_rationale?: string;

  // SOF/SOW
  source_of_funds?: string;
  source_of_funds_verified: boolean;
  source_of_wealth?: string;
  source_of_wealth_verified: boolean;

  // Beneficial Ownership
  beneficial_owners: jsonb; // Array of beneficial owner objects

  // Risk
  pep_status: boolean;
  sanctions_screening_result?: string;
  adverse_media_findings?: string;
  base_risk_score: number; // 0-100
  current_risk_rating: 'Low' | 'Medium' | 'High' | 'Very High';
  institutional_risk_multiplier: number;

  // Due Diligence
  current_dd_level: 'simplified' | 'standard' | 'enhanced';

  // Senior Approval (EDD)
  senior_approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  approved_by?: uuid;
  approved_at?: Date;
  approval_notes?: string;

  // Simplified DD
  simplified_dd_justification?: string;
  simplified_dd_risk_factors: jsonb;

  // Monitoring
  next_review_date?: Date;
  last_review_date?: Date;
  review_frequency: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  monitoring_status: 'active' | 'overdue' | 'suspended' | 'closed';

  // First Payment (EDD)
  first_payment_verified: boolean;
  first_payment_details: jsonb;

  // Status
  client_status: 'active' | 'inactive' | 'suspended' | 'rejected';

  // Timestamps
  created_at: Date;
  updated_at: Date;
  created_by?: uuid;
}
```

---

## HELPER FUNCTIONS & UTILITIES

### Risk Color Function
```javascript
getRiskColor(riskRating) {
  switch(riskRating) {
    case 'Low': return '#10b981';
    case 'Medium': return '#f59e0b';
    case 'High': return '#ef4444';
    case 'Very High': return '#7f1d1d';
    default: return '#6b7280';
  }
}
```

### Monitoring Status Color
```javascript
getMonitoringStatusColor(status) {
  switch(status) {
    case 'active': return '#10b981';
    case 'overdue': return '#ef4444';
    case 'suspended': return '#f59e0b';
    case 'closed': return '#6b7280';
    default: return '#6b7280';
  }
}
```

### Review Date Calculations
```javascript
getDaysUntilReview(reviewDate) {
  const today = new Date();
  const review = new Date(reviewDate);
  const diffTime = review - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

isReviewOverdue(reviewDate) {
  return getDaysUntilReview(reviewDate) < 0;
}
```

### DD Level Info
```javascript
const dueDiligenceLevelInfo = {
  simplified: {
    color: '#10b981',
    description: 'Reduced documentation for low-risk clients...',
    features: [
      'Basic identification only',
      'Reduced verification requirements',
      'Annual review schedule',
      'Low-risk monitoring'
    ]
  },
  standard: {
    color: '#f59e0b',
    description: 'Standard verification for medium-risk clients...',
    features: [
      'Full identity verification',
      'Source of funds verification',
      'Quarterly review schedule',
      'Regular monitoring'
    ]
  },
  enhanced: {
    color: '#ef4444',
    description: 'Enhanced procedures for high-risk clients...',
    features: [
      'Enhanced identity verification',
      'Source of wealth verification',
      'Senior management approval required',
      'Monthly review schedule',
      'Continuous enhanced monitoring'
    ]
  }
};
```

---

## RESPONSIVE DESIGN

### Breakpoints

**Desktop (> 1200px):**
- Two-column grid for profile information
- All features fully expanded

**Tablet (768px - 1200px):**
- Single column for profile information
- Category grid adjusts to 2 columns
- Tabs may wrap to multiple rows

**Mobile (< 768px):**
- Single column layout throughout
- Tabs stack vertically or scroll horizontally
- Category grid becomes single column
- Reduced padding and font sizes

### Mobile Adjustments
```css
@media (max-width: 768px) {
  .profileGrid {
    grid-template-columns: 1fr;
  }

  .categoriesGrid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
}
```

---

## INTERACTIONS & BEHAVIORS

### 1. DD Level Change
**Trigger:** User selects different DD level from dropdown
**Flow:**
1. Show confirmation dialog
2. Update `kyc_clients.current_dd_level`
3. Trigger automatic review date recalculation
4. Update senior approval status if changing to/from Enhanced
5. Reload client data
6. Show success message

### 2. Tab Navigation
**Trigger:** User clicks tab
**Flow:**
1. Update `activeTab` state
2. Fade out current content
3. Load new tab component
4. Fade in new content

### 3. Enhanced DD Upgrade
**Trigger:** User clicks "Upgrade to Enhanced DD" in alert
**Flow:**
1. Show confirmation dialog
2. Call `updateDDLevel('enhanced')`
3. Same flow as DD Level Change

### 4. Back Button
**Trigger:** User clicks "← Back"
**Flow:**
1. Navigate to `/client/dashboard`
2. Preserve any filters/state from previous view

### 5. Document Template Generation
**Trigger:** User navigates to SOF/SOW or EDD Templates tab
**Flow:**
1. Load template component
2. Pre-populate with client data
3. Enable print functionality

---

## LOADING STATES

### Initial Load
- Show "Loading client details..." message
- Center on page
- Gray text (#718096)

### Data Not Found
- Show "Client not found" message
- Redirect to dashboard after 2 seconds

### Tab Content Loading
- Show loading spinner in tab content area
- Prevent interaction until loaded

---

## ERROR HANDLING

### Access Denied
- Check if client belongs to user's organization
- Alert: "Client not found or access denied"
- Redirect to dashboard

### Update Failures
- Catch errors in try-catch blocks
- Alert user with error message
- Log error to console
- Don't update UI if update failed

### Missing Data
- Show fallback values ("Not provided", "Not set")
- Don't break layout
- Use optional chaining for nested properties

---

## SECURITY CONSIDERATIONS

### Row-Level Security
- All queries filtered by `organization_id`
- User must belong to same organization as client
- RLS policies enforce at database level

### Data Validation
- Validate DD level before update
- Confirm destructive actions
- Sanitize user inputs

### Sensitive Information
- PEP status clearly marked
- Risk ratings prominently displayed
- Audit trail of all changes

---

## PERFORMANCE OPTIMIZATION

### Data Loading
- Single query for client data
- Separate query for EDD documents (only when needed)
- Use Supabase `.select()` to specify only needed fields

### Component Optimization
- Conditional rendering of DD-specific components
- Lazy load tab content
- Memoize expensive calculations

### Caching
- Cache document requirements
- Reuse DD level info from constants
- Minimize re-renders with proper state management

---

## ACCESSIBILITY

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons/tabs
- Escape to close modals

### Screen Readers
- Semantic HTML structure
- ARIA labels on icons
- Clear heading hierarchy

### Color Contrast
- All text meets WCAG AA standards
- Risk badges have sufficient contrast
- Status indicators use both color and text

---

## TESTING CHECKLIST

### Functional Tests
- [ ] Client data loads correctly
- [ ] DD level change updates database
- [ ] Tab navigation works
- [ ] Risk badges show correct colors
- [ ] Review date calculations accurate
- [ ] EDD triggers detect correctly
- [ ] Document requirements load by DD level
- [ ] Templates generate with client data

### Visual Tests
- [ ] Header gradient displays correctly
- [ ] Cards have proper spacing
- [ ] Badges render with correct colors
- [ ] Icons display properly
- [ ] Responsive layout works on mobile
- [ ] Print templates format correctly

### Security Tests
- [ ] RLS prevents unauthorized access
- [ ] Organization filtering works
- [ ] Updates validate permissions
- [ ] Sensitive data protected

---

## INTEGRATION POINTS

### Components Used
- `ClientDocumentManagement` - Document requirements display
- `SOFSOWTemplates` - Source of funds/wealth forms
- `EDDDocumentTemplates` - Enhanced DD forms
- `useAuth` - Authentication context
- `supabaseClient` - Database connection

### Utilities Used
- `kycData.js` - Risk calculation functions
- `documentUtils.js` - Document requirement functions
- `frameworkUtils.js` - Framework-specific utilities

### Navigation
- `/client/dashboard` - Back to client list
- `/kyc-client/:clientId` - This page (with different IDs)

---

## FUTURE ENHANCEMENTS

### Planned Features
1. Document upload functionality (currently in development)
2. Inline document verification
3. Activity timeline/audit log
4. Risk score visualization chart
5. Beneficial ownership tree view
6. Transaction monitoring integration
7. Automated screening integration
8. Email notifications for reviews
9. Export client profile to PDF
10. Bulk document download

---

## MAINTENANCE NOTES

### Code Location
- Main component: `/src/components/KYCClientDetails.jsx`
- Document management: `/src/components/ClientDocumentManagement.jsx`
- SOF/SOW templates: `/src/components/SOFSOWTemplates.jsx`
- EDD templates: `/src/components/EDDDocumentTemplates.jsx`
- Utilities: `/src/data/kycData.js`, `/src/utils/documentUtils.js`

### Database Dependencies
- Must maintain `kyc_clients` table structure
- Document types must be seeded correctly
- DD requirements mapping must be current
- EDD document types must match code

### Style Updates
- All styles inline (object-based)
- Golden ratio used: #d4af37, #f4d03f
- Navy blue theme: #0a1929, #1a2f45
- Maintain consistent spacing (8px grid)

---

## DEPLOYMENT CHECKLIST

Before deploying changes:
- [ ] Test all DD levels (simplified, standard, enhanced)
- [ ] Test with different client types
- [ ] Verify RLS policies working
- [ ] Check responsive design
- [ ] Test all tab transitions
- [ ] Verify document requirements load
- [ ] Test print functionality
- [ ] Check error handling
- [ ] Validate data updates
- [ ] Review console for errors

---

**END OF SPECIFICATIONS**
