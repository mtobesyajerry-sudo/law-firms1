import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  getRequiredDocuments,
  getDocumentCategoryColor
} from '../utils/documentUtils';

export default function ClientDocumentManagement({ client, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    loadDocuments();
  }, [client]);

  const loadDocuments = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const required = await getRequiredDocuments(supabase, client.current_dd_level || 'standard', client.client_type);
      setRequiredDocs(required);
    } catch (error) {
      console.error('Error loading documents:', error);
      alert('Failed to load document requirements');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };


  if (loading) {
    return <div style={styles.loading}>Loading document requirements...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Security Notice */}
      <div style={styles.securityNotice}>
        <div style={styles.noticeHeader}>
          <span style={styles.noticeIcon}>🔒</span>
          <h3 style={styles.noticeTitle}>Secure Document Handling</h3>
        </div>
        <p style={styles.noticeText}>
          We are currently upgrading our secure document management features to provide enhanced protection for sensitive client information. This includes improved encryption, secure storage, and advanced access controls.
        </p>
        <p style={styles.noticeText}>
          In the meantime, please use your firm's approved secure channels to collect and verify the documents listed below. Document uploads within the platform will be available shortly once the upgraded security environment is completed.
        </p>
        <p style={styles.noticeText}>
          Thank you for your patience and commitment to maintaining the highest compliance and security standards.
        </p>
      </div>

      {/* Required Documents Checklist */}
      <div style={styles.documentsSection}>
        <h3 style={styles.sectionTitle}>
          Required Documents Checklist
          <span style={styles.ddLevelBadge}>
            {client.current_dd_level || 'standard'} DD
          </span>
        </h3>

        {requiredDocs.length > 0 ? (
          <div style={styles.categoriesList}>
            {['identity', 'address', 'corporate', 'ownership', 'financial', 'regulatory', 'other'].map(category => {
              const categoryDocs = requiredDocs.filter(
                req => req.document_types.category === category
              );

              if (categoryDocs.length === 0) return null;

              const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
              const isExpanded = expandedCategories[category];

              return (
                <div key={category} style={styles.categoryItem}>
                  <div
                    style={{
                      ...styles.categoryHeaderCollapsible,
                      background: getDocumentCategoryColor(category)
                    }}
                    onClick={() => toggleCategory(category)}
                  >
                    <div style={styles.categoryHeaderContent}>
                      <span style={styles.categoryName}>{displayCategory}</span>
                      <span style={styles.documentCount}>
                        {categoryDocs.length} {categoryDocs.length === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                    <span style={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={styles.categoryDocumentsExpanded}>
                      {categoryDocs.map(req => {
                        const docType = req.document_types;
                        const description = req.description || docType.description || '';
                        const hasTemplateIndicator = description.includes('📄');

                        return (
                          <div key={req.id} style={styles.documentItem}>
                            <div style={styles.docItemHeader}>
                              <span style={styles.docItemTitle}>
                                {hasTemplateIndicator && '📄 '}
                                {docType.name}
                              </span>
                              <span style={req.is_mandatory ? styles.requiredBadgeSmall : styles.optionalBadgeSmall}>
                                {req.is_mandatory ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            {description && (
                              <p style={styles.docItemDescription}>
                                {description}
                              </p>
                            )}
                            {docType.validation_rules && (
                              <div style={styles.validationInfoSmall}>
                                <strong>Validation:</strong> {docType.validation_rules}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No document requirements configured for this due diligence level.</p>
          </div>
        )}
      </div>

      {/* Alternative Methods Notice */}
      <div style={styles.infoCard}>
        <h4 style={styles.infoTitle}>Document Collection Guidelines</h4>
        <ul style={styles.guidelinesList}>
          <li>Collect original documents or certified copies in person when possible</li>
          <li>Verify document authenticity through official channels</li>
          <li>Maintain physical document copies in secure, locked storage</li>
          <li>Record document verification details in your offline compliance register</li>
          <li>Ensure documents are current and not expired</li>
          <li>For high-risk clients, conduct additional verification steps as required</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  securityNotice: {
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  noticeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  noticeIcon: {
    fontSize: '28px',
  },
  noticeTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#92400e',
  },
  noticeText: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.6',
  },
  documentsSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    margin: '0 0 24px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ddLevelBadge: {
    padding: '4px 12px',
    background: '#dbeafe',
    color: '#1e40af',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'white',
  },
  categoryHeaderCollapsible: {
    padding: '16px 20px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  categoryHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: '700',
  },
  documentCount: {
    fontSize: '13px',
    fontWeight: '500',
    opacity: 0.9,
  },
  expandIcon: {
    fontSize: '14px',
    transition: 'transform 0.2s ease',
  },
  categoryDocumentsExpanded: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#fafafa',
    borderTop: '1px solid #e5e7eb',
  },
  documentItem: {
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  docItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '8px',
  },
  docItemTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.4',
    flex: 1,
  },
  requiredBadgeSmall: {
    padding: '2px 6px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    flexShrink: 0,
  },
  optionalBadgeSmall: {
    padding: '2px 6px',
    background: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    flexShrink: 0,
  },
  docItemDescription: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  validationInfoSmall: {
    marginTop: '8px',
    padding: '6px 10px',
    background: '#e0f2fe',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#0c4a6e',
    lineHeight: '1.4',
  },
  templateNotice: {
    marginTop: '8px',
    padding: '8px 12px',
    background: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  templateIcon: {
    fontSize: '16px',
  },
  templateText: {
    fontSize: '12px',
    color: '#065f46',
    lineHeight: '1.4',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  infoCard: {
    background: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
  },
  infoTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#0c4a6e',
  },
  guidelinesList: {
    margin: 0,
    paddingLeft: '24px',
    color: '#0c4a6e',
    fontSize: '14px',
    lineHeight: '1.8',
  },
};
