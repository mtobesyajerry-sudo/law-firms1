import React, { useState, useEffect } from 'react';
import { DocumentService } from '../services/documentService';
import { sanitizeUrl } from '../utils/sanitization';
import { fmtDate } from '../utils/dateFormat';

export default function DocumentViewer({ documentId, onClose }) {
  const [document, setDocument] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await DocumentService.viewDocument(documentId);
      setDocument(result.document);
      setUrl(result.url);
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const downloadUrl = await DocumentService.downloadDocument(documentId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  if (!documentId) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h3 style={styles.title}>
              {document?.document_name || 'Loading...'}
            </h3>
            {document && (
              <div style={styles.metadata}>
                <span style={styles.metadataItem}>
                  {DocumentService.formatFileSize(document.file_size)}
                </span>
                <span style={styles.metadataItem}>
                  {fmtDate(document.created_at)}
                </span>
                <span style={styles.metadataItem}>
                  {document.classification?.toUpperCase() || 'CONFIDENTIAL'}
                </span>
              </div>
            )}
          </div>
          <div style={styles.headerActions}>
            <button onClick={handleDownload} style={styles.downloadButton} title="Download">
              ⬇ Download
            </button>
            <button onClick={onClose} style={styles.closeButton} title="Close">
              ✕
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading document...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <p style={styles.errorText}>{error}</p>
              <button onClick={onClose} style={styles.errorButton}>Close</button>
            </div>
          ) : (
            <>
              {document?.mime_type.startsWith('image/') ? (
                <img
                  src={sanitizeUrl(url) ?? ''}
                  alt={document.document_name}
                  style={styles.image}
                />
              ) : document?.mime_type === 'application/pdf' ? (
                <iframe
                  src={sanitizeUrl(url) ?? ''}
                  style={styles.iframe}
                  title={document.document_name}
                />
              ) : (
                <div style={styles.noPreviewContainer}>
                  <div style={styles.noPreviewIcon}>📄</div>
                  <p style={styles.noPreviewText}>
                    Preview not available for this file type
                  </p>
                  <p style={styles.noPreviewSubtext}>
                    {document.mime_type}
                  </p>
                  <button onClick={handleDownload} style={styles.previewDownloadButton}>
                    Download to View
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {document?.watermarked && (
          <div style={styles.watermarkNotice}>
            🔒 This document is watermarked and protected
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    maxWidth: '1200px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  headerLeft: {
    flex: 1,
    minWidth: 0
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  metadata: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  metadataItem: {
    fontSize: '13px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    marginLeft: '24px'
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '700',
    transition: 'all 0.2s',
    flexShrink: 0
  },
  content: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '16px',
    marginBottom: '16px'
  },
  errorButton: {
    padding: '10px 24px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  iframe: {
    width: '100%',
    height: '70vh',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  },
  noPreviewContainer: {
    textAlign: 'center',
    padding: '60px'
  },
  noPreviewIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  noPreviewText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '8px',
    fontWeight: '500'
  },
  noPreviewSubtext: {
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '24px',
    fontFamily: 'monospace'
  },
  previewDownloadButton: {
    padding: '12px 32px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  watermarkNotice: {
    padding: '12px 24px',
    backgroundColor: '#fef3c7',
    borderTop: '1px solid #fde68a',
    color: '#92400e',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'center'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
