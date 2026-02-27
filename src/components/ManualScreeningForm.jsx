import React, { useState, useEffect } from 'react';
import { screeningService } from '../services/screeningService';
import { dashboardStyles, getBadgeStyle } from '../utils/dashboardStyles';

export default function ManualScreeningForm({ client, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [screeningLists, setScreeningLists] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [formData, setFormData] = useState({
    screening_type: 'onboarding',
    sanctions_checked: false,
    pep_checked: false,
    adverse_media_checked: false,
    watchlist_checked: false,
    match_found: false,
    matches: [],
    overall_risk_score: 0,
    risk_level: 'low',
    screening_status: 'cleared',
    review_notes: '',
  });

  const [currentMatch, setCurrentMatch] = useState({
    list_type: 'sanctions',
    list_name: '',
    matched_name: '',
    match_confidence: 100,
    match_reason: '',
    additional_details: '',
  });

  useEffect(() => {
    loadScreeningLists();
  }, []);

  const loadScreeningLists = async () => {
    try {
      const lists = await screeningService.getScreeningLists();
      setScreeningLists(lists);
    } catch (error) {
      console.error('Error loading screening lists:', error);
    }
  };

  const handleSearch = async (searchTerm, listType) => {
    if (!searchTerm || searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await screeningService.searchScreeningEntries(searchTerm, listType);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMatch = () => {
    if (!currentMatch.matched_name) {
      alert('Please enter a matched name');
      return;
    }

    setFormData(prev => ({
      ...prev,
      matches: [...prev.matches, { ...currentMatch, id: Date.now() }],
      match_found: true,
    }));

    setCurrentMatch({
      list_type: 'sanctions',
      list_name: '',
      matched_name: '',
      match_confidence: 100,
      match_reason: '',
      additional_details: '',
    });
    setSearchResults([]);
  };

  const handleRemoveMatch = (matchId) => {
    setFormData(prev => {
      const newMatches = prev.matches.filter(m => m.id !== matchId);
      return {
        ...prev,
        matches: newMatches,
        match_found: newMatches.length > 0,
      };
    });
  };

  const handleSelectSearchResult = (entry) => {
    setCurrentMatch(prev => ({
      ...prev,
      matched_name: entry.full_name,
      list_name: entry.list?.list_name || '',
      list_type: entry.list?.list_type || prev.list_type,
      additional_details: JSON.stringify({
        aliases: entry.aliases,
        nationality: entry.nationality,
        dob: entry.date_of_birth,
        pep_position: entry.pep_position,
        sanctions_program: entry.sanctions_program,
      }, null, 2),
    }));
    setSearchResults([]);
  };

  const calculateRiskScore = () => {
    if (formData.matches.length === 0) return 0;

    const avgConfidence = formData.matches.reduce((sum, m) => sum + m.match_confidence, 0) / formData.matches.length;
    const hasHighRiskList = formData.matches.some(m => m.list_type === 'sanctions' || m.list_type === 'pep');

    let score = avgConfidence;
    if (hasHighRiskList) score = Math.min(100, score + 20);

    return Math.round(score);
  };

  const determineRiskLevel = (score) => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const getRiskBadgeStyle = (level) => {
    const colors = {
      critical: { bg: '#fee2e2', color: '#991b1b' },
      high: { bg: '#fed7aa', color: '#c2410c' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      low: { bg: '#d1fae5', color: '#065f46' }
    };
    const style = colors[level] || colors.low;
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const riskScore = calculateRiskScore();
      const riskLevel = determineRiskLevel(riskScore);

      await screeningService.createScreeningResult({
        client_id: client.id,
        screening_type: formData.screening_type,
        match_found: formData.match_found,
        match_count: formData.matches.length,
        matches: formData.matches,
        overall_risk_score: riskScore,
        risk_level: riskLevel,
        screening_status: formData.match_found ? 'under_review' : 'cleared',
        review_notes: formData.review_notes,
      });

      alert('Screening result recorded successfully');
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error creating screening result:', error);
      alert('Error recording screening result: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e8eaed',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0a1929',
    background: 'white',
    transition: 'all 0.2s',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px',
    letterSpacing: '0.3px'
  };

  const sectionStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '2px solid #e8eaed',
    marginBottom: '20px'
  };

  return (
    <div style={dashboardStyles.pageContainer}>
      {/* Header */}
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerContent}>
          <div>
            <div style={dashboardStyles.headerTitle}>MANUAL SCREENING</div>
            <h1 style={dashboardStyles.headerSubtitle}>
              {client?.client_name || client?.full_name}
            </h1>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                ...dashboardStyles.buttonSecondary,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.borderColor = '#d4af37';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Screening Type */}
        <div style={sectionStyle}>
          <h3 style={{ ...dashboardStyles.sectionTitle, marginBottom: '20px', fontSize: '18px' }}>
            Screening Details
          </h3>
          <div>
            <label style={labelStyle}>Screening Type</label>
            <select
              value={formData.screening_type}
              onChange={(e) => setFormData({ ...formData, screening_type: e.target.value })}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#d4af37'}
              onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
            >
              <option value="onboarding">Onboarding</option>
              <option value="periodic">Periodic Review</option>
              <option value="triggered">Event-Triggered</option>
              <option value="continuous">Continuous Monitoring</option>
            </select>
          </div>
        </div>

        {/* Screening Checks */}
        <div style={sectionStyle}>
          <h3 style={{ ...dashboardStyles.sectionTitle, marginBottom: '20px', fontSize: '18px' }}>
            Screening Checks Performed
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <CheckboxField
              label="Sanctions Lists"
              checked={formData.sanctions_checked}
              onChange={(e) => setFormData({ ...formData, sanctions_checked: e.target.checked })}
            />
            <CheckboxField
              label="PEP Lists"
              checked={formData.pep_checked}
              onChange={(e) => setFormData({ ...formData, pep_checked: e.target.checked })}
            />
            <CheckboxField
              label="Adverse Media"
              checked={formData.adverse_media_checked}
              onChange={(e) => setFormData({ ...formData, adverse_media_checked: e.target.checked })}
            />
            <CheckboxField
              label="Internal Watchlist"
              checked={formData.watchlist_checked}
              onChange={(e) => setFormData({ ...formData, watchlist_checked: e.target.checked })}
            />
          </div>
        </div>

        {/* Add Match */}
        <div style={sectionStyle}>
          <h3 style={{ ...dashboardStyles.sectionTitle, marginBottom: '20px', fontSize: '18px' }}>
            Add Match (if found)
          </h3>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>List Type</label>
                <select
                  value={currentMatch.list_type}
                  onChange={(e) => setCurrentMatch({ ...currentMatch, list_type: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                  onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                >
                  <option value="sanctions">Sanctions</option>
                  <option value="pep">PEP</option>
                  <option value="adverse_media">Adverse Media</option>
                  <option value="watchlist">Watchlist</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Match Confidence (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentMatch.match_confidence}
                  onChange={(e) => setCurrentMatch({ ...currentMatch, match_confidence: parseInt(e.target.value) || 0 })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                  onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Search Name in Lists</label>
              <input
                type="text"
                placeholder="Type at least 3 characters to search..."
                onChange={(e) => handleSearch(e.target.value, currentMatch.list_type)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
              />
              {searching && (
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                  Searching...
                </div>
              )}
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  marginTop: '8px',
                  background: 'white',
                  border: '2px solid #d4af37',
                  borderRadius: '8px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                }}>
                  {searchResults.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(entry)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: '1px solid #e8eaed',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      <div style={{ fontWeight: '600', color: '#0a1929', marginBottom: '4px' }}>
                        {entry.full_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {entry.list?.list_name} - {entry.list?.list_type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Matched Name *</label>
              <input
                type="text"
                value={currentMatch.matched_name}
                onChange={(e) => setCurrentMatch({ ...currentMatch, matched_name: e.target.value })}
                placeholder="Enter the name that matched"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
              />
            </div>

            <div>
              <label style={labelStyle}>List Name</label>
              <input
                type="text"
                value={currentMatch.list_name}
                onChange={(e) => setCurrentMatch({ ...currentMatch, list_name: e.target.value })}
                placeholder="e.g., OFAC SDN, UN Sanctions, etc."
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
              />
            </div>

            <div>
              <label style={labelStyle}>Match Reason</label>
              <textarea
                value={currentMatch.match_reason}
                onChange={(e) => setCurrentMatch({ ...currentMatch, match_reason: e.target.value })}
                placeholder="Why this is considered a match"
                rows="3"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
              />
            </div>

            <div>
              <label style={labelStyle}>Additional Details</label>
              <textarea
                value={currentMatch.additional_details}
                onChange={(e) => setCurrentMatch({ ...currentMatch, additional_details: e.target.value })}
                placeholder="Any additional information about the match"
                rows="3"
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }}
                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
              />
            </div>

            <button
              type="button"
              onClick={handleAddMatch}
              style={dashboardStyles.button}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Add Match
            </button>
          </div>
        </div>

        {/* Recorded Matches */}
        {formData.matches.length > 0 && (
          <div style={{
            ...sectionStyle,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)',
            border: '2px solid #d4af37'
          }}>
            <h3 style={{ ...dashboardStyles.sectionTitle, marginBottom: '20px', fontSize: '18px' }}>
              Recorded Matches ({formData.matches.length})
            </h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              {formData.matches.map((match) => (
                <div
                  key={match.id}
                  style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '2px solid #e8eaed',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '15px', marginBottom: '8px' }}>
                      {match.matched_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                      <span style={{
                        ...dashboardStyles.badge,
                        background: '#dbeafe',
                        color: '#1e40af',
                        marginRight: '8px'
                      }}>
                        {match.list_type.toUpperCase()}
                      </span>
                      {match.list_name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Confidence: <strong>{match.match_confidence}%</strong>
                    </div>
                    {match.match_reason && (
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '8px',
                        padding: '8px',
                        background: '#f8f9fa',
                        borderRadius: '6px'
                      }}>
                        {match.match_reason}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMatch(match.id)}
                    style={{
                      ...dashboardStyles.buttonDanger,
                      marginLeft: '16px',
                      padding: '8px 16px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #d4af37',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1929' }}>
                Calculated Risk Assessment
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  Score: <strong style={{ color: '#0a1929' }}>{calculateRiskScore()}</strong>
                </div>
                <span style={getRiskBadgeStyle(determineRiskLevel(calculateRiskScore()))}>
                  {determineRiskLevel(calculateRiskScore()).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Screening Notes */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Screening Notes</label>
          <textarea
            value={formData.review_notes}
            onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
            placeholder="Add any notes about the screening process, sources checked, or findings..."
            rows="5"
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = '#d4af37'}
            onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
          />
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...dashboardStyles.button,
              flex: 1,
              padding: '14px 24px',
              fontSize: '15px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'Saving Screening Result...' : 'Submit Screening Result'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                ...dashboardStyles.buttonSecondary,
                padding: '14px 24px',
                fontSize: '15px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      borderRadius: '8px',
      border: '2px solid #e8eaed',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#d4af37';
      e.currentTarget.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e8eaed';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: '18px',
          height: '18px',
          cursor: 'pointer',
          accentColor: '#d4af37'
        }}
      />
      <span style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#0a1929'
      }}>
        {label}
      </span>
    </label>
  );
}
