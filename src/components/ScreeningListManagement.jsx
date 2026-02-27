import React, { useState, useEffect } from 'react';
import { screeningService } from '../services/screeningService';
import { dashboardStyles } from '../utils/dashboardStyles';

export default function ScreeningListManagement() {
  const [loading, setLoading] = useState(true);
  const [screeningLists, setScreeningLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [listEntries, setListEntries] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const [newList, setNewList] = useState({
    list_name: '',
    list_type: 'sanctions',
    source: '',
    jurisdiction: '',
    description: '',
    update_frequency: 'monthly',
  });

  const [newEntry, setNewEntry] = useState({
    entry_type: 'individual',
    full_name: '',
    aliases: [],
    date_of_birth: '',
    place_of_birth: '',
    nationality: [],
    pep_position: '',
    pep_level: '',
    sanctions_program: '',
    risk_score: 100,
  });

  useEffect(() => {
    loadScreeningLists();
  }, []);

  const loadScreeningLists = async () => {
    setLoading(true);
    try {
      const lists = await screeningService.getScreeningLists();
      setScreeningLists(lists);
    } catch (error) {
      console.error('Error loading screening lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadListEntries = async (listId) => {
    try {
      const entries = await screeningService.getScreeningListEntries(listId);
      setListEntries(entries);
    } catch (error) {
      console.error('Error loading list entries:', error);
    }
  };

  const handleSelectList = (list) => {
    setSelectedList(list);
    loadListEntries(list.id);
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await screeningService.createScreeningList(newList);
      alert('Screening list created successfully');
      setShowAddList(false);
      setNewList({
        list_name: '',
        list_type: 'sanctions',
        source: '',
        jurisdiction: '',
        description: '',
        update_frequency: 'monthly',
      });
      loadScreeningLists();
    } catch (error) {
      console.error('Error creating list:', error);
      alert('Error creating list: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!selectedList) return;

    setLoading(true);
    try {
      await screeningService.createScreeningListEntry({
        ...newEntry,
        list_id: selectedList.id,
      });
      alert('Entry added successfully');
      setShowAddEntry(false);
      setNewEntry({
        entry_type: 'individual',
        full_name: '',
        aliases: [],
        date_of_birth: '',
        place_of_birth: '',
        nationality: [],
        pep_position: '',
        pep_level: '',
        sanctions_program: '',
        risk_score: 100,
      });
      loadListEntries(selectedList.id);
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Error creating entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      await screeningService.deleteScreeningListEntry(entryId);
      alert('Entry deleted successfully');
      loadListEntries(selectedList.id);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry: ' + error.message);
    }
  };

  const getListTypeBadgeStyle = (type) => {
    const colors = {
      sanctions: { bg: '#fee2e2', color: '#991b1b' },
      pep: { bg: '#e9d5ff', color: '#6b21a8' },
      adverse_media: { bg: '#fed7aa', color: '#c2410c' },
      watchlist: { bg: '#dbeafe', color: '#1e40af' },
      internal: { bg: '#e5e7eb', color: '#374151' },
    };
    const style = colors[type] || colors.internal;
    return {
      ...dashboardStyles.badge,
      background: style.bg,
      color: style.color
    };
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

  if (loading && screeningLists.length === 0) {
    return (
      <div style={{
        ...dashboardStyles.pageContainer,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e8eaed',
            borderTop: '4px solid #d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
            Loading screening lists...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.pageContainer}>
      {/* Header */}
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerContent}>
          <div>
            <div style={dashboardStyles.headerTitle}>SCREENING LIST MANAGEMENT</div>
            <h1 style={dashboardStyles.headerSubtitle}>
              Manage sanctions, PEP, and watchlist databases
            </h1>
          </div>
          <button
            onClick={() => setShowAddList(true)}
            style={{
              ...dashboardStyles.button,
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.25)';
              e.target.style.borderColor = '#d4af37';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.15)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
          >
            Add New List
          </button>
        </div>
      </div>

      {/* Add List Modal */}
      {showAddList && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #e8eaed',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0a1929' }}>
                Add New Screening List
              </h2>
              <button
                onClick={() => setShowAddList(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => e.target.style.color = '#0a1929'}
                onMouseLeave={(e) => e.target.style.color = '#64748b'}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateList} style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>List Name *</label>
                  <input
                    type="text"
                    value={newList.list_name}
                    onChange={(e) => setNewList({ ...newList, list_name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>List Type *</label>
                    <select
                      value={newList.list_type}
                      onChange={(e) => setNewList({ ...newList, list_type: e.target.value })}
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
                    <label style={labelStyle}>Update Frequency</label>
                    <select
                      value={newList.update_frequency}
                      onChange={(e) => setNewList({ ...newList, update_frequency: e.target.value })}
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Source *</label>
                    <input
                      type="text"
                      value={newList.source}
                      onChange={(e) => setNewList({ ...newList, source: e.target.value })}
                      placeholder="e.g., OFAC, UN, EU"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Jurisdiction</label>
                    <input
                      type="text"
                      value={newList.jurisdiction}
                      onChange={(e) => setNewList({ ...newList, jurisdiction: e.target.value })}
                      placeholder="e.g., USA, Global, Tanzania"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    rows="3"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    style={{ ...dashboardStyles.button, flex: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    Create List
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddList(false)}
                    style={{ ...dashboardStyles.buttonSecondary, padding: '10px 24px' }}
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
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntry && selectedList && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #e8eaed',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0a1929' }}>
                Add Entry to {selectedList.list_name}
              </h2>
              <button
                onClick={() => setShowAddEntry(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => e.target.style.color = '#0a1929'}
                onMouseLeave={(e) => e.target.style.color = '#64748b'}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateEntry} style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Entry Type *</label>
                  <select
                    value={newEntry.entry_type}
                    onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                  >
                    <option value="individual">Individual</option>
                    <option value="entity">Entity</option>
                    <option value="vessel">Vessel</option>
                    <option value="address">Address</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    value={newEntry.full_name}
                    onChange={(e) => setNewEntry({ ...newEntry, full_name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Aliases (comma-separated)</label>
                  <input
                    type="text"
                    onChange={(e) => setNewEntry({ ...newEntry, aliases: e.target.value.split(',').map(a => a.trim()) })}
                    placeholder="Alias 1, Alias 2, Alias 3"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                  />
                </div>

                {newEntry.entry_type === 'individual' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Date of Birth</label>
                      <input
                        type="date"
                        value={newEntry.date_of_birth}
                        onChange={(e) => setNewEntry({ ...newEntry, date_of_birth: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                        onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Place of Birth</label>
                      <input
                        type="text"
                        value={newEntry.place_of_birth}
                        onChange={(e) => setNewEntry({ ...newEntry, place_of_birth: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                        onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Nationality (comma-separated)</label>
                  <input
                    type="text"
                    onChange={(e) => setNewEntry({ ...newEntry, nationality: e.target.value.split(',').map(n => n.trim()) })}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                  />
                </div>

                {selectedList.list_type === 'pep' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>PEP Position</label>
                      <input
                        type="text"
                        value={newEntry.pep_position}
                        onChange={(e) => setNewEntry({ ...newEntry, pep_position: e.target.value })}
                        placeholder="e.g., Minister of Finance"
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                        onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>PEP Level</label>
                      <select
                        value={newEntry.pep_level}
                        onChange={(e) => setNewEntry({ ...newEntry, pep_level: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                        onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                      >
                        <option value="">Select level</option>
                        <option value="foreign">Foreign PEP</option>
                        <option value="domestic">Domestic PEP</option>
                        <option value="international_org">International Organization</option>
                        <option value="family">Family Member</option>
                        <option value="associate">Close Associate</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedList.list_type === 'sanctions' && (
                  <div>
                    <label style={labelStyle}>Sanctions Program</label>
                    <input
                      type="text"
                      value={newEntry.sanctions_program}
                      onChange={(e) => setNewEntry({ ...newEntry, sanctions_program: e.target.value })}
                      placeholder="e.g., OFAC SDN, UN Sanctions"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                      onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Risk Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newEntry.risk_score}
                    onChange={(e) => setNewEntry({ ...newEntry, risk_score: parseInt(e.target.value) || 0 })}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                    onBlur={(e) => e.target.style.borderColor = '#e8eaed'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                  <button
                    type="submit"
                    style={{ ...dashboardStyles.button, flex: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    Add Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEntry(false)}
                    style={{ ...dashboardStyles.buttonSecondary, padding: '10px 24px' }}
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
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Lists Sidebar */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '2px solid #e8eaed',
          overflow: 'hidden',
          minWidth: '300px',
          maxWidth: '400px'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '2px solid #e8eaed',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929' }}>
              Screening Lists ({screeningLists.length})
            </h2>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {screeningLists.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <svg style={{ width: '48px', height: '48px', margin: '0 auto', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>
                  No screening lists yet
                </p>
                <button
                  onClick={() => setShowAddList(true)}
                  style={{
                    marginTop: '16px',
                    color: '#d4af37',
                    fontSize: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Create your first list
                </button>
              </div>
            ) : (
              screeningLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleSelectList(list)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid #e8eaed',
                    background: selectedList?.id === list.id ? 'linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: selectedList?.id === list.id ? '4px solid #d4af37' : '4px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedList?.id !== list.id) {
                      e.target.style.background = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedList?.id !== list.id) {
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                    {list.list_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={getListTypeBadgeStyle(list.list_type)}>
                      {list.list_type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{list.source}</span>
                  </div>
                  {list.jurisdiction && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{list.jurisdiction}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Entries Panel */}
        <div style={{ flex: 1, minWidth: '400px' }}>
          {!selectedList ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #e8eaed',
              padding: '60px 40px',
              textAlign: 'center'
            }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p style={{ marginTop: '20px', fontSize: '18px', fontWeight: '600', color: '#0a1929' }}>
                Select a list to view entries
              </p>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                Choose a screening list from the left panel to manage its entries
              </p>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #e8eaed',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '24px',
                borderBottom: '2px solid #e8eaed',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0a1929', marginBottom: '8px' }}>
                    {selectedList.list_name}
                  </h2>
                  {selectedList.description && (
                    <p style={{ fontSize: '14px', color: '#64748b' }}>
                      {selectedList.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddEntry(true)}
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
                  Add Entry
                </button>
              </div>
              <div style={{ padding: '24px' }}>
                {listEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <svg style={{ width: '48px', height: '48px', margin: '0 auto', color: '#cbd5e1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
                      No entries in this list
                    </p>
                    <button
                      onClick={() => setShowAddEntry(true)}
                      style={{
                        marginTop: '16px',
                        color: '#d4af37',
                        fontSize: '14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Add the first entry
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {listEntries.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          border: '2px solid #e8eaed',
                          borderRadius: '8px',
                          padding: '16px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#d4af37';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e8eaed';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', color: '#0a1929', fontSize: '16px', marginBottom: '8px' }}>
                              {entry.full_name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                              <span style={{
                                ...dashboardStyles.badge,
                                background: '#e0e7ff',
                                color: '#3730a3'
                              }}>
                                {entry.entry_type}
                              </span>
                              {entry.date_of_birth && (
                                <span style={{ marginLeft: '8px' }}>DOB: {entry.date_of_birth}</span>
                              )}
                            </div>
                            {entry.aliases && entry.aliases.length > 0 && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                                <strong>Aliases:</strong> {entry.aliases.join(', ')}
                              </div>
                            )}
                            {entry.pep_position && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                <strong>Position:</strong> {entry.pep_position}
                              </div>
                            )}
                            {entry.sanctions_program && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                <strong>Program:</strong> {entry.sanctions_program}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            style={{
                              ...dashboardStyles.buttonDanger,
                              marginLeft: '16px',
                              padding: '8px 16px',
                              fontSize: '13px'
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
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
