# Three-Component Integration Overview

## Executive Summary

The three core components of the AML system can be deeply integrated to create a comprehensive compliance workflow:

1. **KYC Client Management** - Customer onboarding and risk profiling
2. **Institutional Risk Assessment** - Organization-level AML/CFT control assessment
3. **Transaction Monitoring & STR Alerts** - Ongoing monitoring and suspicious activity reporting

## Current Database Relationships

### Existing Connections

```
organizations
    ├─→ assessments (Institutional Risk Assessment)
    ├─→ kyc_clients (KYC Client Management)
    └─→ transaction_alerts (STR Alert System)

kyc_clients
    ├─→ transaction_alerts (via client_id)
    └─→ str_submissions (indirectly through alerts)

transaction_alerts
    ├─→ kyc_clients (via client_id)
    ├─→ transaction_monitoring_rules (via triggered_by_rule_id)
    └─→ compliance_cases (via compliance_case_id)
```

## Integration Points & Information Sharing

### 1. KYC → Institutional Assessment

**Information Flow:**
- Client risk profile distribution feeds into institutional risk assessment
- High-risk client concentration impacts organization's inherent risk
- PEP client count affects Module 1 assessment responses
- Geographic risk from client base informs assessment

**Shared Data:**
- `kyc_clients.current_risk_rating` → Assessment Module 1 (Customer Risk)
- `kyc_clients.pep_status` → Assessment response weighting
- `kyc_clients.country_of_residence` → Geographic risk analysis
- Client risk distribution statistics → Assessment Introduction section

**Implementation:**
```javascript
// Calculate client risk distribution for assessment
const clientStats = {
  totalClients: clients.length,
  highRisk: clients.filter(c => c.current_risk_rating === 'High').length,
  pepClients: clients.filter(c => c.pep_status).length,
  highRiskJurisdictions: clients.filter(c => c.fatf_high_risk_jurisdiction).length
};

// Use in assessment.customer_risk_statistics
await supabase
  .from('assessments')
  .update({ customer_risk_statistics: clientStats })
  .eq('id', assessmentId);
```

### 2. KYC → Transaction Alerts

**Information Flow:**
- Client risk profile determines monitoring intensity
- Expected transaction patterns set alert thresholds
- PEP status triggers enhanced monitoring rules
- Document verification status affects alert scoring

**Shared Data:**
- `kyc_clients.current_risk_rating` → `transaction_alerts.client_risk_rating`
- `kyc_clients.expected_monthly_volume_usd` → Alert threshold calibration
- `kyc_clients.pep_status` → Enhanced monitoring flag
- `kyc_clients.enhanced_monitoring_required` → Alert rule selection

**Current Database Link:**
```sql
-- transaction_alerts already references kyc_clients
transaction_alerts.client_id → kyc_clients.id
```

### 3. Institutional Assessment → Transaction Monitoring

**Information Flow:**
- Assessment Module 3 (Effectiveness) scores determine system-wide alert thresholds
- Low effectiveness scores trigger more conservative monitoring
- Control maturity (Module 4) influences false positive tolerance
- Overall institutional risk affects escalation procedures

**Shared Data:**
- `assessments.module_3_score` → System-wide alert sensitivity
- `assessments.module_4_score` → Process automation level
- `assessments.overall_risk_rating` → STR escalation thresholds
- Assessment completion status → Compliance dashboard

**Implementation Strategy:**
```javascript
// Adjust monitoring based on institutional assessment
const assessment = await getLatestAssessment(organizationId);

if (assessment.module_3_score < 2.5) {
  // Low effectiveness = stricter monitoring
  applyConservativeThresholds();
} else if (assessment.module_4_score >= 4.0) {
  // High maturity = can handle more nuanced rules
  enableAdvancedRulesets();
}
```

### 4. Transaction Alerts → KYC Client Updates

**Information Flow:**
- Alert patterns trigger KYC review requirements
- STR filings update client risk profile
- False positive history affects future alert weighting
- Investigation findings may require re-assessment

**Shared Data:**
- `transaction_alerts.str_filed` → `kyc_clients.str_filed_count`
- `transaction_alerts.resolution_type` → Client risk re-evaluation
- Alert frequency → `kyc_clients.next_review_date`
- Investigation conclusions → `kyc_clients.enhanced_monitoring_reason`

**Auto-Update Mechanism:**
```sql
-- Trigger to update client when STR filed
CREATE TRIGGER update_client_on_str
AFTER UPDATE ON transaction_alerts
FOR EACH ROW
WHEN (NEW.str_filed = true AND OLD.str_filed = false)
EXECUTE FUNCTION increment_client_str_count();
```

## Integrated Dashboard Metrics

### Cross-Component KPIs

1. **Risk-Weighted Client Portfolio**
   - Combines KYC risk ratings with transaction behavior
   - Weighted by institutional assessment scores

2. **Control Effectiveness vs Alert Volume**
   - Module 3 score vs false positive rate
   - Shows if controls are actually working

3. **Client Risk Correlation**
   - High-risk clients vs STR filing rate
   - Validates risk assessment accuracy

4. **Compliance Posture Score**
   - Institutional assessment + KYC completion rate + Alert resolution speed
   - Single metric for board reporting

## Implementation Roadmap

### Phase 1: Real-Time Data Synchronization
- [x] Database foreign key relationships established
- [ ] Client risk changes trigger assessment flags
- [ ] Alert patterns update client risk scores
- [ ] Assessment scores influence monitoring thresholds

### Phase 2: Unified Interface
- [ ] Dashboard shows integrated metrics
- [ ] Client detail page shows related alerts
- [ ] Assessment report includes client statistics
- [ ] Alert detail shows client risk profile

### Phase 3: Automated Workflows
- [ ] High-risk client onboarding requires assessment review
- [ ] Alert escalation routes based on assessment scores
- [ ] Periodic KYC reviews triggered by alert patterns
- [ ] Assessment recommendations based on alert trends

### Phase 4: Intelligence Layer
- [ ] ML models predict client risk using all data sources
- [ ] Pattern detection across clients and assessments
- [ ] Automated control effectiveness scoring
- [ ] Risk appetite calibration suggestions

## Technical Implementation Examples

### Unified Client Risk View

```javascript
async function getClientCompleteRisk(clientId) {
  // Get KYC data
  const client = await supabase
    .from('kyc_clients')
    .select('*')
    .eq('id', clientId)
    .single();

  // Get alert history
  const { data: alerts } = await supabase
    .from('transaction_alerts')
    .select('alert_severity, resolution_type, str_filed')
    .eq('client_id', clientId);

  // Get organization assessment
  const { data: assessment } = await supabase
    .from('assessments')
    .select('module_1_score, module_3_score, overall_risk_rating')
    .eq('organization_id', client.organization_id)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    baseRisk: client.current_risk_rating,
    alertScore: calculateAlertScore(alerts),
    institutionalContext: assessment?.overall_risk_rating,
    controlEffectiveness: assessment?.module_3_score,
    compositeRisk: calculateCompositeRisk(client, alerts, assessment)
  };
}
```

### Assessment-Aware Alert Routing

```javascript
async function routeAlert(alert) {
  const assessment = await getLatestAssessment(alert.organization_id);

  // Low maturity = escalate faster
  if (assessment.module_4_score < 2.5) {
    alert.alert_priority = Math.min(alert.alert_priority + 1, 5);
  }

  // High risk institution + high severity alert = immediate escalation
  if (assessment.overall_risk_rating === 'High' && alert.alert_severity === 'Critical') {
    alert.investigation_status = 'Escalated';
    await notifyComplianceOfficer(alert);
  }

  return alert;
}
```

### Dynamic Monitoring Threshold Adjustment

```javascript
async function getMonitoringThresholds(organizationId) {
  const assessment = await getLatestAssessment(organizationId);
  const baseThresholds = getStandardThresholds();

  // Adjust based on institutional controls
  const adjustmentFactor = calculateAdjustmentFactor({
    technicalCompliance: assessment.module_2_score,
    effectiveness: assessment.module_3_score,
    maturity: assessment.module_4_score
  });

  return {
    largeTransaction: baseThresholds.largeTransaction * adjustmentFactor,
    velocityLimit: baseThresholds.velocityLimit * adjustmentFactor,
    structuringThreshold: baseThresholds.structuringThreshold * adjustmentFactor
  };
}

function calculateAdjustmentFactor(scores) {
  // Low scores = stricter thresholds (lower multiplier)
  // High scores = can use higher thresholds
  const avgScore = (scores.technicalCompliance + scores.effectiveness + scores.maturity) / 3;

  if (avgScore >= 4.0) return 1.2;      // Can handle 20% higher thresholds
  if (avgScore >= 3.0) return 1.0;      // Standard thresholds
  if (avgScore >= 2.0) return 0.85;     // 15% stricter
  return 0.7;                            // 30% stricter for weak controls
}
```

## Benefits of Integration

### Operational Benefits
- **Single Source of Truth**: All client risk information in one place
- **Automated Workflows**: Risk changes propagate automatically
- **Reduced Manual Work**: System updates metrics across components
- **Consistent Risk Assessment**: Same data drives all decisions

### Compliance Benefits
- **Holistic Risk View**: See client, transaction, and institutional risk together
- **Better Audit Trail**: Connected data shows complete compliance story
- **Proactive Management**: Early warning when trends emerge
- **Regulatory Alignment**: Demonstrates comprehensive risk management

### Business Benefits
- **Faster Decisions**: Complete information at fingertips
- **Better Resource Allocation**: Focus on highest combined risks
- **Improved Customer Experience**: Appropriate treatment based on full profile
- **Cost Optimization**: Reduce false positives while maintaining coverage

## Next Steps

To implement this integration:

1. **Update UI Components** to show cross-component data
2. **Create Integration Service** layer for business logic
3. **Add Database Triggers** for automatic updates
4. **Build Unified Dashboard** with integrated metrics
5. **Implement Workflow Automation** for risk-based actions
6. **Add Analytics Engine** for pattern detection

The foundation is already in place with proper foreign key relationships. The next step is to build the service layer and UI that leverages these connections.
