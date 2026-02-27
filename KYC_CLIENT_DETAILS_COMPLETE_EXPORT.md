# KYC CLIENT DETAILS PAGE - COMPLETE EXPORT PACKAGE

**Complete specifications, code, and implementation details for reproducing the KYC Client Information page in any application.**

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Complete Component Code](#complete-component-code)
5. [Helper Functions & Utilities](#helper-functions--utilities)
6. [Styling System](#styling-system)
7. [Feature Specifications](#feature-specifications)
8. [Integration Guide](#integration-guide)
9. [Testing Guidelines](#testing-guidelines)

---

## OVERVIEW

### Purpose
The KYC Client Details page is a comprehensive customer due diligence management interface that supports three-tier due diligence (Simplified, Standard, Enhanced) with automatic status tracking, document management, and compliance workflows.

### Key Features
- ✅ Three-tier due diligence system (Simplified/Standard/Enhanced)
- ✅ Automatic Enhanced DD trigger detection
- ✅ Risk-based client profiling
- ✅ Document requirement management by DD level
- ✅ Source of Funds/Wealth verification templates
- ✅ Enhanced DD questionnaire templates
- ✅ Continuous monitoring scheduling
- ✅ PEP identification and handling
- ✅ Senior management approval workflow
- ✅ Professional corporate design (Navy/Gold theme)

### Route Structure
```
/kyc-client/:clientId
```

---

## TECHNOLOGY STACK

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "@supabase/supabase-js": "^2.39.0"
}
```

### Database
- **Supabase PostgreSQL** with Row-Level Security
- Real-time subscriptions (optional)
- Secure document storage (Supabase Storage)

---

## DATABASE SCHEMA

### Primary Table: `kyc_clients`

```sql
CREATE TABLE kyc_clients (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'corporate', 'trust', 'partnership', 'other')),
  client_name TEXT NOT NULL,
  client_id_number TEXT,
  date_of_birth DATE,
  incorporation_date DATE,
  nationality TEXT,
  country_of_residence TEXT,
  country_of_incorporation TEXT,

  -- Business Information
  business_activity TEXT,
  estimated_annual_turnover TEXT,
  purpose_of_relationship TEXT,
  legal_service_type TEXT,
  expected_transaction_volume TEXT,
  economic_rationale TEXT,

  -- Source of Funds/Wealth
  source_of_funds TEXT,
  source_of_funds_verified BOOLEAN DEFAULT FALSE,
  source_of_wealth TEXT,
  source_of_wealth_verified BOOLEAN DEFAULT FALSE,

  -- Beneficial Ownership
  beneficial_owners JSONB DEFAULT '[]',

  -- Risk Assessment
  pep_status BOOLEAN DEFAULT FALSE,
  sanctions_screening_result TEXT,
  adverse_media_findings TEXT,
  base_risk_score INTEGER DEFAULT 0,
  current_risk_rating TEXT DEFAULT 'Medium' CHECK (current_risk_rating IN ('Low', 'Medium', 'High', 'Very High')),
  institutional_risk_multiplier DECIMAL DEFAULT 1.0,

  -- Due Diligence
  current_dd_level TEXT DEFAULT 'standard' CHECK (current_dd_level IN ('simplified', 'standard', 'enhanced')),

  -- Enhanced DD - Senior Approval
  senior_approval_status TEXT DEFAULT 'not_required' CHECK (senior_approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Simplified DD
  simplified_dd_justification TEXT,
  simplified_dd_risk_factors JSONB,

  -- Monitoring
  next_review_date DATE,
  last_review_date DATE,
  review_frequency TEXT CHECK (review_frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  monitoring_status TEXT DEFAULT 'active' CHECK (monitoring_status IN ('active', 'overdue', 'suspended', 'closed')),

  -- Enhanced DD - First Payment
  first_payment_verified BOOLEAN DEFAULT FALSE,
  first_payment_details JSONB,

  -- Status
  client_status TEXT DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'suspended', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE kyc_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view clients in their organization"
  ON kyc_clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update clients in their organization"
  ON kyc_clients FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
```

### Related Tables

#### `edd_documents`
```sql
CREATE TABLE edd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES edd_document_types(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  content JSONB,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `edd_document_types`
```sql
CREATE TABLE edd_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  template_structure JSONB,
  required_for_dd_level TEXT[] DEFAULT ARRAY['enhanced'],
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `dd_level_document_requirements`
```sql
CREATE TABLE dd_level_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dd_level TEXT NOT NULL CHECK (dd_level IN ('simplified', 'standard', 'enhanced')),
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'legal_entity')),
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  is_mandatory BOOLEAN DEFAULT TRUE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## COMPLETE COMPONENT CODE

### Main Component: `KYCClientDetails.jsx`

**File Location:** `/src/components/KYCClientDetails.jsx`

**Complete Code:** *(See attached file or inline below)*

```jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ClientDocumentManagement from './ClientDocumentManagement';
import SOFSOWTemplates from './SOFSOWTemplates';
import EDDDocumentTemplates from './EDDDocumentTemplates';
import {
  getRiskColor,
  dueDiligenceLevels,
  dueDiligenceLevelInfo,
  getDDLevelRequirements,
  requiresSeniorApproval,
  requiresSourceOfWealth,
  requiresSimplifiedJustification,
  getApprovalStatusColor,
  getMonitoringStatusColor,
  getDaysUntilReview,
  isReviewOverdue
} from '../data/kycData';
import { checkEnhancedDDTriggers } from '../utils/documentUtils';

// ... [Rest of the component code from the file] ...
```

*Full code is 1258 lines - see source file for complete implementation*

### Sub-Components

#### 1. `StandardDDStatusSection` Component

```jsx
function StandardDDStatusSection({ client }) {
  const getStatusColor = (isCompleted) => {
    return isCompleted
      ? { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✓' }
      : { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '○' };
  };

  const sofStatus = getStatusColor(client.source_of_funds_verified);
  const pendingCount = !client.source_of_funds_verified ? 1 : 0;

  return (
    <div style={unifiedStyles.container}>
      <div style={unifiedStyles.header}>
        <span style={unifiedStyles.headerTitle}>Standard DD Checklist</span>
        {pendingCount > 0 ? (
          <span style={unifiedStyles.pendingBadge}>
            {pendingCount} Pending
          </span>
        ) : (
          <span style={unifiedStyles.completedBadge}>
            All Complete
          </span>
        )}
      </div>

      <div style={unifiedStyles.grid}>
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Core Requirements</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sofStatus.bg,
              color: sofStatus.color,
              borderColor: sofStatus.border
            }}>
              {sofStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Funds</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_funds_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2. `EnhancedDDStatusSection` Component

```jsx
function EnhancedDDStatusSection({ client, eddDocuments = [] }) {
  const getStatusColor = (isCompleted) => {
    return isCompleted
      ? { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', icon: '✓' }
      : { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '○' };
  };

  const getEDDDocumentStatus = (documentName) => {
    const doc = eddDocuments.find(d => d.document_type?.name === documentName);
    return doc?.status === 'completed';
  };

  const sofStatus = getStatusColor(client.source_of_funds_verified);
  const sowStatus = getStatusColor(client.source_of_wealth_verified);
  const approvalStatus = getStatusColor(
    client.senior_approval_status === 'approved'
  );
  const pepStatus = getStatusColor(getEDDDocumentStatus('PEP Declaration'));
  const screeningStatus = getStatusColor(getEDDDocumentStatus('Public Records Search Results'));

  const pendingCount = [
    !client.source_of_funds_verified,
    !client.source_of_wealth_verified,
    client.senior_approval_status !== 'approved',
    !getEDDDocumentStatus('PEP Declaration'),
    !getEDDDocumentStatus('Public Records Search Results')
  ].filter(Boolean).length;

  return (
    <div style={unifiedStyles.container}>
      <div style={unifiedStyles.header}>
        <span style={unifiedStyles.headerTitle}>Enhanced DD Checklist</span>
        {pendingCount > 0 ? (
          <span style={unifiedStyles.pendingBadge}>
            {pendingCount} Pending
          </span>
        ) : (
          <span style={unifiedStyles.completedBadge}>
            All Complete
          </span>
        )}
      </div>

      <div style={unifiedStyles.grid}>
        {/* Core Requirements */}
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Core Requirements</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sofStatus.bg,
              color: sofStatus.color,
              borderColor: sofStatus.border
            }}>
              {sofStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Funds</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_funds_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: sowStatus.bg,
              color: sowStatus.color,
              borderColor: sowStatus.border
            }}>
              {sowStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Source of Wealth</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.source_of_wealth_verified ? 'Verified' : 'Requires verification'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: approvalStatus.bg,
              color: approvalStatus.color,
              borderColor: approvalStatus.border
            }}>
              {approvalStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Senior Approval</div>
              <div style={unifiedStyles.statusSubtext}>
                {client.senior_approval_status === 'approved'
                  ? 'Approved'
                  : client.senior_approval_status || 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Screening Requirements */}
        <div style={unifiedStyles.section}>
          <div style={unifiedStyles.sectionTitle}>Screening & Monitoring</div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: pepStatus.bg,
              color: pepStatus.color,
              borderColor: pepStatus.border
            }}>
              {pepStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>PEP Declaration</div>
              <div style={unifiedStyles.statusSubtext}>
                {getEDDDocumentStatus('PEP Declaration') ? 'Completed' : 'Pending'}
              </div>
            </div>
          </div>

          <div style={unifiedStyles.statusItem}>
            <div style={{
              ...unifiedStyles.statusIcon,
              backgroundColor: screeningStatus.bg,
              color: screeningStatus.color,
              borderColor: screeningStatus.border
            }}>
              {screeningStatus.icon}
            </div>
            <div style={unifiedStyles.statusContent}>
              <div style={unifiedStyles.statusLabel}>Public Records Screening</div>
              <div style={unifiedStyles.statusSubtext}>
                {getEDDDocumentStatus('Public Records Search Results') ? 'Completed' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## HELPER FUNCTIONS & UTILITIES

### File: `kycData.js`

**Location:** `/src/data/kycData.js`

**Key Functions:**

#### Risk Calculation
```javascript
export function calculateRiskScore(riskFactors) {
  const weights = {
    client: 0.30,
    service: 0.25,
    geography: 0.20,
    behaviour: 0.15,
    delivery: 0.10
  };

  const clientScore = calculateCategoryScore(riskFactors.client || {});
  const serviceScore = calculateCategoryScore(riskFactors.service || {});
  const geographyScore = calculateCategoryScore(riskFactors.geography || {});
  const behaviourScore = calculateCategoryScore(riskFactors.behaviour || {});
  const deliveryScore = calculateCategoryScore(riskFactors.delivery || {});

  const baseScore =
    (clientScore * weights.client) +
    (serviceScore * weights.service) +
    (geographyScore * weights.geography) +
    (behaviourScore * weights.behaviour) +
    (deliveryScore * weights.delivery);

  return Math.round(baseScore * 20);
}

function calculateCategoryScore(categoryFactors) {
  if (Object.keys(categoryFactors).length === 0) return 0;

  const scores = Object.values(categoryFactors).filter(s => typeof s === 'number');
  if (scores.length === 0) return 0;

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
```

#### DD Level Determination
```javascript
export function getDueDiligenceLevel(riskScore, institutionalMultiplier = 1.0) {
  const adjustedScore = riskScore * institutionalMultiplier;

  if (adjustedScore <= 30) return dueDiligenceLevels.SIMPLIFIED;
  if (adjustedScore <= 60) return dueDiligenceLevels.STANDARD;
  return dueDiligenceLevels.ENHANCED;
}

export function getRiskLevel(riskScore) {
  if (riskScore <= 30) return riskLevels.LOW;
  if (riskScore <= 60) return riskLevels.MEDIUM;
  if (riskScore <= 80) return riskLevels.HIGH;
  return riskLevels.VERY_HIGH;
}
```

#### Risk Colors
```javascript
export function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case riskLevels.LOW: return '#10b981';
    case riskLevels.MEDIUM: return '#f59e0b';
    case riskLevels.HIGH: return '#ef4444';
    case riskLevels.VERY_HIGH: return '#991b1b';
    default: return '#6b7280';
  }
}
```

#### Date Calculations
```javascript
export function isReviewOverdue(nextReviewDate) {
  if (!nextReviewDate) return false;
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  return reviewDate < today;
}

export function getDaysUntilReview(nextReviewDate) {
  if (!nextReviewDate) return null;
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  const diffTime = reviewDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateNextReviewDate(frequency) {
  const today = new Date();
  switch (frequency) {
    case 'weekly':
      today.setDate(today.getDate() + 7);
      break;
    case 'monthly':
      today.setMonth(today.getMonth() + 1);
      break;
    case 'quarterly':
      today.setMonth(today.getMonth() + 3);
      break;
    case 'semi_annual':
      today.setMonth(today.getMonth() + 6);
      break;
    case 'annual':
      today.setFullYear(today.getFullYear() + 1);
      break;
    default:
      today.setMonth(today.getMonth() + 3);
  }
  return today.toISOString().split('T')[0];
}
```

### File: `documentUtils.js`

**Location:** `/src/utils/documentUtils.js`

#### Enhanced DD Trigger Detection
```javascript
export function checkEnhancedDDTriggers(client) {
  const triggers = [];

  if (client.pep_status) {
    triggers.push({
      type: 'pep',
      description: 'Client is a Politically Exposed Person',
      requiredDocs: ['pep_declaration', 'public_position_verify', 'asset_declaration', 'source_of_wealth']
    });
  }

  if (client.country_of_residence && isHighRiskJurisdiction(client.country_of_residence)) {
    triggers.push({
      type: 'high_risk_jurisdiction',
      description: 'Client from high-risk jurisdiction',
      requiredDocs: ['enhanced_due_diligence']
    });
  }

  if (client.country_of_incorporation && isOffshoreJurisdiction(client.country_of_incorporation)) {
    triggers.push({
      type: 'offshore',
      description: 'Offshore entity structure',
      requiredDocs: ['offshore_entity_docs', 'trust_nominee_docs', 'group_structure']
    });
  }

  if (client.current_risk_rating === 'High' || client.current_risk_rating === 'Very High') {
    triggers.push({
      type: 'high_risk',
      description: 'High risk rating assigned',
      requiredDocs: ['bank_statements_12m', 'source_of_wealth', 'transaction_history']
    });
  }

  return {
    isTriggered: triggers.length > 0,
    triggers,
    recommendedLevel: triggers.length > 0 ? 'enhanced' : 'standard'
  };
}
```

#### Document Category Colors
```javascript
export function getDocumentCategoryColor(category) {
  const colors = {
    identity: '#3b82f6',
    address: '#10b981',
    financial: '#f59e0b',
    corporate: '#8b5cf6',
    ownership: '#ec4899',
    regulatory: '#ef4444',
    other: '#6b7280'
  };
  return colors[category] || colors.other;
}
```

---

## STYLING SYSTEM

### Complete Style Object

**All styles are inline using JavaScript objects:**

```javascript
const styles = {
  // Container & Layout
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },

  // Header Section
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: 'white',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },

  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },

  // Badges
  badge: {
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    border: '2px solid',
  },

  // Cards
  infoCard: {
    background: 'white',
    border: '2px solid #d4af37',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '8px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },

  tab: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
  },

  activeTab: {
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.4)',
  },

  // ... (Full style object is 1200+ lines)
};
```

### Color Palette

**Corporate Theme:**
```javascript
const colorPalette = {
  // Primary Colors
  navyBlue: '#0a1929',
  slateBlue: '#1a2f45',
  gold: '#d4af37',
  lightGold: '#f4d03f',

  // Risk Colors
  lowRisk: '#10b981',      // Green
  mediumRisk: '#f59e0b',   // Amber
  highRisk: '#ef4444',     // Red
  veryHighRisk: '#991b1b', // Dark Red

  // Status Colors
  active: '#10b981',
  inactive: '#ef4444',
  suspended: '#f59e0b',
  pending: '#3b82f6',

  // Document Categories
  identity: '#3b82f6',
  address: '#10b981',
  financial: '#f59e0b',
  corporate: '#8b5cf6',
  regulatory: '#ef4444',

  // Backgrounds
  pageBackground: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  cardBackground: '#ffffff',
  lightGray: '#f8f9fa',
  veryLightGray: '#fafafa',

  // Borders
  primaryBorder: '#d4af37',
  lightBorder: '#e5e7eb',
  mediumBorder: '#e2e8f0',

  // Text
  primaryText: '#0a1929',
  secondaryText: '#1f2937',
  mutedText: '#6b7280',
  lightText: '#9ca3af',
};
```

### Responsive Breakpoints

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

@media (min-width: 769px) and (max-width: 1200px) {
  .profileGrid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1201px) {
  .profileGrid {
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  }
}
```

---

## FEATURE SPECIFICATIONS

### 1. Enhanced DD Trigger System

**Trigger Conditions:**
- PEP status detected → Mandatory Enhanced DD
- High/Very High risk rating → Enhanced DD recommended
- High-risk jurisdiction → Enhanced DD required
- Offshore structures → Enhanced DD required
- Adverse media findings → Enhanced DD review
- Complex ownership → Enhanced DD consideration

**Alert Display:**
```jsx
{ddTriggers && ddTriggers.isTriggered && (
  <div style={styles.alertCard}>
    <div style={styles.alertHeader}>
      <span>⚠️</span>
      <h3 style={styles.alertTitle}>Enhanced Due Diligence Triggers Detected</h3>
    </div>
    <p style={styles.alertDescription}>
      This client has {ddTriggers.triggers.length} trigger(s) that may require enhanced due diligence:
    </p>
    <ul style={styles.triggerList}>
      {ddTriggers.triggers.map((trigger, idx) => (
        <li key={idx} style={styles.triggerItem}>
          <strong>{trigger.type.toUpperCase()}:</strong> {trigger.description}
        </li>
      ))}
    </ul>
    {client.current_dd_level !== 'enhanced' && (
      <button
        onClick={() => updateDDLevel('enhanced')}
        style={styles.upgradeButton}
      >
        Upgrade to Enhanced DD
      </button>
    )}
  </div>
)}
```

### 2. Three-Tier DD System

**Simplified DD:**
- Requires justification documentation
- Annual review schedule
- Minimal document requirements
- Low-risk clients only

**Standard DD:**
- Full identity verification
- Source of Funds verification
- Quarterly review schedule
- Beneficial ownership (25%+ threshold)

**Enhanced DD:**
- All Standard requirements PLUS:
- Source of Wealth verification (mandatory)
- Senior management approval (mandatory)
- Monthly/Quarterly review
- Enhanced monitoring
- First payment verification

### 3. Tab Structure

**Tab Configuration:**
```javascript
const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    visible: true,
    component: <OverviewTab />
  },
  {
    id: 'risk',
    label: 'Risk Assessment',
    visible: true,
    component: <RiskTab />
  },
  {
    id: 'documents',
    label: 'Documents',
    visible: true,
    component: <DocumentsTab />
  },
  {
    id: 'sof-sow-templates',
    label: 'SOF/SOW Templates',
    visible: ['standard', 'enhanced'].includes(client.current_dd_level),
    component: <SOFSOWTemplates />
  },
  {
    id: 'edd-templates',
    label: 'EDD Templates',
    visible: client.current_dd_level === 'enhanced',
    component: <EDDDocumentTemplates />
  }
];
```

### 4. Status Tracking

**Standard DD Checklist:**
- ✓/○ Source of Funds verified

**Enhanced DD Checklist:**
- ✓/○ Source of Funds verified
- ✓/○ Source of Wealth verified
- ✓/○ Senior Approval obtained
- ✓/○ PEP Declaration completed
- ✓/○ Public Records Screening completed

**Status Icons:**
- ✓ (Green) = Completed
- ○ (Amber) = Pending

### 5. Document Management

**Document Categories:**
- Identity (Blue: #3b82f6)
- Address (Green: #10b981)
- Financial (Amber: #f59e0b)
- Regulatory (Red: #ef4444)

**Document Requirements by DD Level:**
```javascript
const documentRequirements = {
  simplified: {
    individual: ['basic_id', 'address_proof'],
    legal_entity: ['certificate_incorporation', 'registered_address']
  },
  standard: {
    individual: ['passport_nid', 'address_proof', 'source_of_funds', 'bank_statement'],
    legal_entity: ['certificate_incorporation', 'shareholders_register', 'directors_register', 'financial_statements']
  },
  enhanced: {
    individual: [
      ...standard.individual,
      'source_of_wealth',
      'tax_returns',
      'pep_declaration',
      'public_records_search',
      'enhanced_screening'
    ],
    legal_entity: [
      ...standard.legal_entity,
      'beneficial_owners_register',
      'group_structure',
      'source_of_wealth',
      'audited_financials',
      'senior_approval_form'
    ]
  }
};
```

### 6. Continuous Monitoring

**Review Frequencies:**
- Weekly (Very High Risk Enhanced DD)
- Monthly (High Risk Enhanced DD)
- Quarterly (Standard DD, High Risk Standard DD)
- Semi-Annual (Low-Medium Risk)
- Annual (Simplified DD, Low Risk)

**Overdue Detection:**
```javascript
const isOverdue = isReviewOverdue(client.next_review_date);
const daysUntil = getDaysUntilReview(client.next_review_date);

// Display logic
{client.next_review_date ? (
  <>
    {new Date(client.next_review_date).toLocaleDateString()}
    {isOverdue ? (
      <span style={styles.overdueWarning}>⚠️ OVERDUE</span>
    ) : (
      <span style={styles.countdown}>(in {daysUntil} days)</span>
    )}
  </>
) : 'Not Scheduled'}
```

---

## INTEGRATION GUIDE

### Step 1: Install Dependencies

```bash
npm install react react-dom react-router-dom @supabase/supabase-js
```

### Step 2: Setup Supabase Client

```javascript
// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 3: Create Auth Context

```javascript
// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Step 4: Setup Routing

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import KYCClientDetails from './components/KYCClientDetails';
import KYCClientManagement from './components/KYCClientManagement';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/client/dashboard" element={<KYCClientManagement />} />
          <Route path="/kyc-client/:clientId" element={<KYCClientDetails />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

### Step 5: Apply Database Migrations

Run all SQL migrations in order (see Database Schema section above).

### Step 6: Seed Document Types

```sql
-- Seed document types for DD requirements
INSERT INTO document_types (code, name, category, description) VALUES
  ('passport_nid', 'Passport or National ID', 'identity', 'Valid government-issued identification'),
  ('address_proof', 'Proof of Address', 'address', 'Utility bill or bank statement'),
  ('source_of_funds', 'Source of Funds Declaration', 'financial', 'Documentation of transaction funds origin'),
  ('source_of_wealth', 'Source of Wealth Declaration', 'financial', 'Documentation of overall wealth accumulation'),
  ('pep_declaration', 'PEP Declaration Form', 'regulatory', 'Political exposure declaration'),
  ('public_records_search', 'Public Records Search Results', 'regulatory', 'Background screening results'),
  -- ... (add all required document types)
ON CONFLICT (code) DO NOTHING;
```

### Step 7: Configure Environment Variables

```bash
# .env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## TESTING GUIDELINES

### Unit Tests

**Test Risk Calculations:**
```javascript
import { calculateRiskScore, getRiskLevel, getDueDiligenceLevel } from './kycData';

describe('Risk Calculation', () => {
  test('calculates correct risk score', () => {
    const riskFactors = {
      client: { occupation: 5, netWorth: 5, pepStatus: 5 },
      service: { serviceType: 5, transactionValue: 5, complexity: 5 },
      geography: { countryRisk: 5, offshoreInvolvement: 5 },
      behaviour: { informationProvision: 5, urgency: 5 },
      delivery: { meetingType: 4, intermediaries: 5 }
    };

    const score = calculateRiskScore(riskFactors);
    expect(score).toBeGreaterThan(80);
    expect(getRiskLevel(score)).toBe('Very High');
    expect(getDueDiligenceLevel(score)).toBe('enhanced');
  });
});
```

### Integration Tests

**Test Client Data Loading:**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KYCClientDetails from './KYCClientDetails';

test('loads and displays client data', async () => {
  render(
    <MemoryRouter initialEntries={['/kyc-client/test-id']}>
      <Routes>
        <Route path="/kyc-client/:clientId" element={<KYCClientDetails />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
  });
});
```

### E2E Tests

**Test DD Level Change:**
```javascript
describe('DD Level Management', () => {
  it('should change DD level and show confirmation', () => {
    cy.visit('/kyc-client/test-client-id');
    cy.get('[data-testid="dd-level-select"]').select('enhanced');
    cy.on('window:confirm', () => true);
    cy.contains('Due diligence level updated').should('be.visible');
  });
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] All database migrations applied
- [ ] Document types seeded
- [ ] RLS policies enabled and tested
- [ ] Environment variables configured
- [ ] Authentication working
- [ ] Organization filtering working
- [ ] All DD levels tested (Simplified, Standard, Enhanced)
- [ ] Enhanced DD triggers detecting correctly
- [ ] Document requirements loading by DD level
- [ ] SOF/SOW templates printing correctly
- [ ] EDD templates generating correctly
- [ ] Status tracking updating properly
- [ ] Review date calculations accurate
- [ ] Responsive design tested on mobile/tablet
- [ ] Console free of errors
- [ ] Performance optimized
- [ ] Build succeeds without warnings

---

## SUPPORT & MAINTENANCE

### Common Issues

**Issue 1: Client Not Loading**
- Check RLS policies
- Verify organization_id match
- Check browser console for errors

**Issue 2: DD Level Not Updating**
- Confirm user has update permissions
- Check database constraints
- Verify Supabase connection

**Issue 3: Triggers Not Detecting**
- Review `checkEnhancedDDTriggers` logic
- Verify client data completeness
- Check risk rating calculations

### Updates & Enhancements

**Planned Features:**
- Real-time collaboration
- Automated risk recalculation
- Document OCR integration
- Blockchain verification
- API integrations (sanctions screening)
- Advanced analytics dashboard
- Bulk operations
- Export to regulatory formats

---

## APPENDIX

### A. Complete Constants

**Due Diligence Levels:**
```javascript
export const dueDiligenceLevels = {
  SIMPLIFIED: 'simplified',
  STANDARD: 'standard',
  ENHANCED: 'enhanced'
};
```

**Risk Levels:**
```javascript
export const riskLevels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  VERY_HIGH: 'Very High'
};
```

**Client Types:**
```javascript
export const clientTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate Entity' },
  { value: 'trust', label: 'Trust' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' }
];
```

### B. Icon Reference

**Used Icons:**
- 👤 Basic Information
- 💼 Business & Financial
- 🔒 Due Diligence & Risk
- 🔄 Continuous Monitoring
- ⚠️ Warnings/Alerts
- ✓ Completed Status
- ○ Pending Status
- 📄 Document Templates

### C. Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Support:**
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

---

## VERSION HISTORY

- **v1.0.0** - Initial release with three-tier DD system
- **v1.1.0** - Added Enhanced DD triggers and alerts
- **v1.2.0** - Integrated SOF/SOW templates
- **v1.3.0** - Added EDD document templates
- **v1.4.0** - Status tracking and monitoring dashboard
- **v1.5.0** - Document management integration
- **Current** - Complete export package

---

**END OF COMPLETE EXPORT PACKAGE**

*This document contains everything needed to reproduce the KYC Client Details page in any React application with Supabase backend.*
