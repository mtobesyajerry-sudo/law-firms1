/**
 * Document Management Utilities
 *
 * Handles document requirements, validation, and management
 * for KYC client due diligence workflows
 */

/**
 * Get required documents for a specific DD level and client type
 * @param {Object} supabase - Supabase client
 * @param {string} ddLevel - Due diligence level (simplified, standard, enhanced)
 * @param {string} clientType - Client type (individual, corporate, trust, partnership)
 * @returns {Promise<Array>} List of required documents with details
 */
export async function getRequiredDocuments(supabase, ddLevel, clientType) {
  // Map client types: kyc_clients uses 'corporate', requirements table uses 'legal_entity'
  const mappedClientType = (clientType === 'corporate' || clientType === 'trust' || clientType === 'partnership')
    ? 'legal_entity'
    : clientType;

  const { data, error } = await supabase
    .from('dd_level_document_requirements')
    .select(`
      *,
      document_types (
        id,
        code,
        name,
        category,
        description,
        validity_months
      )
    `)
    .eq('dd_level', ddLevel)
    .eq('client_type', mappedClientType)
    .order('priority');

  if (error) {
    console.error('Error fetching document requirements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get client documents for a specific client
 * @param {Object} supabase - Supabase client
 * @param {string} clientId - Client ID
 * @returns {Promise<Array>} List of client documents
 */
export async function getClientDocuments(supabase, clientId) {
  const { data, error } = await supabase
    .from('client_documents')
    .select(`
      *,
      document_types (
        id,
        code,
        name,
        category,
        description
      ),
      uploaded_by_profile:user_profiles!uploaded_by (
        full_name,
        email
      ),
      verified_by_profile:user_profiles!verified_by (
        full_name,
        email
      )
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching client documents:', error);
    return [];
  }

  return data || [];
}

/**
 * Check document completeness for a client
 * @param {Array} requiredDocs - Required documents for DD level
 * @param {Array} clientDocs - Client's uploaded documents
 * @returns {Object} Completeness status
 */
export function checkDocumentCompleteness(requiredDocs, clientDocs) {
  const mandatoryDocs = requiredDocs.filter(doc => doc.is_mandatory);
  const uploadedDocTypes = new Set(
    clientDocs
      .filter(doc => doc.status === 'verified' || doc.status === 'pending')
      .map(doc => doc.document_type_id)
  );

  const missingMandatory = mandatoryDocs.filter(
    doc => !uploadedDocTypes.has(doc.document_type_id)
  );

  const totalRequired = mandatoryDocs.length;
  const uploaded = mandatoryDocs.filter(doc =>
    uploadedDocTypes.has(doc.document_type_id)
  ).length;

  return {
    isComplete: missingMandatory.length === 0,
    completionPercentage: totalRequired > 0 ? Math.round((uploaded / totalRequired) * 100) : 100,
    totalRequired,
    uploaded,
    missing: missingMandatory.length,
    missingDocuments: missingMandatory.map(doc => ({
      id: doc.document_type_id,
      name: doc.document_types?.name,
      description: doc.description || doc.document_types?.description
    }))
  };
}

/**
 * Check for expiring documents
 * @param {Array} documents - Client documents
 * @param {number} daysThreshold - Days before expiry to alert (default 30)
 * @returns {Array} Documents expiring soon or expired
 */
export function checkExpiringDocuments(documents, daysThreshold = 30) {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  return documents.filter(doc => {
    if (!doc.expiry_date) return false;
    const expiryDate = new Date(doc.expiry_date);
    return expiryDate <= thresholdDate;
  }).map(doc => ({
    ...doc,
    daysUntilExpiry: Math.ceil((new Date(doc.expiry_date) - today) / (1000 * 60 * 60 * 24)),
    isExpired: new Date(doc.expiry_date) < today
  }));
}

/**
 * Get document requirements summary by DD level
 * @param {string} ddLevel - Due diligence level
 * @param {string} clientType - Client type
 * @returns {Object} Summary of document requirements
 */
export function getDocumentRequirementsSummary(ddLevel, clientType) {
  const summaries = {
    simplified: {
      individual: {
        min: 2,
        max: 3,
        description: 'Low-risk clients with minimal documentation'
      },
      legal_entity: {
        min: 3,
        max: 4,
        description: 'Low-risk entities with basic verification'
      }
    },
    standard: {
      individual: {
        min: 5,
        max: 7,
        description: 'Standard due diligence with full verification'
      },
      legal_entity: {
        min: 7,
        max: 10,
        description: 'Standard entity verification with ownership details'
      }
    },
    enhanced: {
      individual: {
        min: 10,
        max: 15,
        description: 'High-risk clients requiring extensive documentation'
      },
      legal_entity: {
        min: 12,
        max: 20,
        description: 'High-risk entities with comprehensive verification'
      }
    }
  };

  return summaries[ddLevel]?.[clientType] || { min: 0, max: 0, description: '' };
}

/**
 * Determine if enhanced DD is triggered
 * @param {Object} client - Client data
 * @returns {Object} Trigger status and reasons
 */
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

  if (client.current_risk_rating === 'High') {
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

/**
 * Check if jurisdiction is high risk
 * @param {string} country - Country code or name
 * @returns {boolean}
 */
function isHighRiskJurisdiction(country) {
  // FATF high-risk and monitored jurisdictions (simplified list)
  const highRiskCountries = [
    'iran', 'north korea', 'myanmar', 'afghanistan', 'yemen',
    'syria', 'somalia', 'libya', 'sudan'
  ];
  return highRiskCountries.includes(country?.toLowerCase());
}

/**
 * Check if jurisdiction is offshore
 * @param {string} country - Country code or name
 * @returns {boolean}
 */
function isOffshoreJurisdiction(country) {
  const offshoreJurisdictions = [
    'cayman islands', 'british virgin islands', 'bermuda', 'panama',
    'seychelles', 'mauritius', 'bahamas', 'jersey', 'guernsey',
    'isle of man', 'luxembourg', 'liechtenstein', 'monaco'
  ];
  return offshoreJurisdictions.includes(country?.toLowerCase());
}

/**
 * Get document category color
 * @param {string} category - Document category
 * @returns {string} Color code
 */
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

/**
 * Get document status badge style
 * @param {string} status - Document status
 * @returns {Object} Style object
 */
export function getDocumentStatusStyle(status) {
  const styles = {
    pending: {
      background: '#fef3c7',
      color: '#92400e',
      text: 'Pending Review'
    },
    verified: {
      background: '#d1fae5',
      color: '#065f46',
      text: 'Verified'
    },
    rejected: {
      background: '#fee2e2',
      color: '#991b1b',
      text: 'Rejected'
    },
    expired: {
      background: '#e5e7eb',
      color: '#374151',
      text: 'Expired'
    }
  };
  return styles[status] || styles.pending;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
