import React, { useState, useEffect } from 'react';
import { DocumentService } from '../services/documentService';

export default function AssessmentDocumentUpload({
  assessmentId,
  organizationId,
  onUploadComplete = null,
  isReadOnly = false
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentCategory, setDocumentCategory] = useState('compliance');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentToView, setDocumentToView] = useState(null);

  const documentCategories = [
    { value: 'compliance', label: 'AML/CFT Policies & Procedures' },
    { value: 'risk_assessment', label: 'Internal Risk Assessments' },
    { value: 'audit', label: 'Internal Audit Reports' },
    { value: 'governance', label: 'Governance & Control Documents' },
    { value: 'sanctions', label: 'Sanctions Screening Procedures' },
    { value: 'licensing', label: 'Regulatory Licenses & Certifications' },
    { value: 'inspection', label: 'Regulatory Inspection Reports' },
    { value: 'evidence', label: 'Supporting Evidence' },
    { value: 'other', label: 'Other Documents' }
  ];

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentDocuments();
    }
  }, [assessmentId]);

  const loadAssessmentDocuments = async () => {
    try {
      setLoading(true);
      const docs = await DocumentService.getAssessmentDocuments(assessmentId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading assessment documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !assessmentId) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');
      setUploadProgress(10);

      const validation = await DocumentService.validateFile(selectedFile);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      setUploadProgress(30);

      const result = await DocumentService.uploadAssessmentDocument({
        file: selectedFile,
        assessmentId: assessmentId,
        organizationId: organizationId,
        documentCategory: documentCategory,
        classification: 'confidential',
        metadata: {
          category: documentCategory,
          uploadedFrom: 'Institutional Risk Assessment',
          uploadTimestamp: new Date().toISOString()
        }
      });

      setUploadProgress(100);
      setSuccess('Document uploaded successfully!');
      setSelectedFile(null);
      document.getElementById('assessment-file-input').value = '';

      await loadAssessmentDocuments();

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      setTimeout(() => {
        setSuccess('');
        setUploadProgress(0);
      }, 3000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId) => {
    try {
      const url = await DocumentService.downloadDocument(documentId);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleView = async (documentId) => {
    try {
      const result = await DocumentService.viewDocument(documentId);
      setDocumentToView(result);
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to view document');
    }
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await DocumentService.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      await loadAssessmentDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      compliance: 'bg-blue-100 text-blue-800',
      risk_assessment: 'bg-purple-100 text-purple-800',
      audit: 'bg-orange-100 text-orange-800',
      governance: 'bg-green-100 text-green-800',
      sanctions: 'bg-red-100 text-red-800',
      licensing: 'bg-indigo-100 text-indigo-800',
      inspection: 'bg-yellow-100 text-yellow-800',
      evidence: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!isReadOnly && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200 px-8 py-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              📎 Document Upload
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Submit supporting documentation to strengthen your compliance assessment
            </p>
          </div>

          <div className="p-8">
            {/* Recommended Documents Info Box */}
            <div className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100/40 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">ℹ️</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-1">Recommended Documents</h4>
                  <p className="text-sm text-gray-600">Upload any of the following to support your assessment:</p>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">AML/CFT policies and procedures</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Internal risk assessment reports</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Internal audit reports and findings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Governance and control documentation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Sanctions screening procedures</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Regulatory licenses and certifications</span>
                  </div>
                  <div className="flex items-start gap-2 md:col-span-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span className="text-sm text-gray-700">Regulatory inspection reports</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Document Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2.5">
                    Document Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={documentCategory}
                    onChange={(e) => setDocumentCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 shadow-sm hover:border-gray-400"
                    disabled={uploading}
                  >
                    {documentCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2.5">
                    Select File <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="assessment-file-input"
                    type="file"
                    onChange={handleFileSelect}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:border-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                    disabled={uploading}
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  />
                  <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                    <span className="font-semibold">Accepted formats:</span>
                    <span>PDF, JPG, PNG, DOCX, XLSX, TXT, ZIP</span>
                    <span className="mx-1">•</span>
                    <span className="font-semibold">Maximum size: 50MB</span>
                  </div>
                </div>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📄</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        {DocumentService.formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        Ready to upload
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Uploading...</span>
                    <span className="text-gray-900 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-bold text-base shadow-md hover:shadow-lg"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200 px-8 py-6">
          <h3 className="text-lg font-bold text-gray-900">Uploaded Documents</h3>
          {documents.length > 0 && (
            <p className="text-sm text-gray-600 font-medium mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
          )}
        </div>

        <div className="p-8">
          {loading ? (
            <div className="text-center py-16">
              <p className="text-gray-700 font-bold">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <p className="text-gray-700 font-bold mb-1.5">No documents uploaded yet</p>
              <p className="text-gray-500 text-sm">Upload supporting documents using the form above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 mb-2 truncate text-base">{doc.file_name}</h4>
                      <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${getCategoryColor(doc.secure_document?.document_type)} mb-3`}>
                        {documentCategories.find(c => c.value === doc.secure_document?.document_type)?.label || 'Other'}
                      </span>
                      <div className="flex items-center gap-5 text-xs text-gray-600">
                        <span className="font-semibold">Size: {DocumentService.formatFileSize(doc.file_size)}</span>
                        <span className="font-semibold">Date: {new Date(doc.created_at).toLocaleDateString()}</span>
                        <span className="font-semibold">By: {doc.uploader?.full_name || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <button
                        onClick={() => handleView(doc.secure_document_id)}
                        className="px-4 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                        title="View Document"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(doc.secure_document_id)}
                        className="px-4 py-2.5 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
                        title="Download Document"
                      >
                        Download
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDelete(doc.secure_document_id)}
                          className="px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
                          title="Delete Document"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {documentToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {documentToView.document.document_name}
              </h3>
              <button
                onClick={() => setDocumentToView(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {documentToView.document.mime_type.startsWith('image/') ? (
                <img
                  src={documentToView.url}
                  alt={documentToView.document.document_name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : documentToView.document.mime_type === 'application/pdf' ? (
                <iframe
                  src={documentToView.url}
                  className="w-full h-[70vh]"
                  title={documentToView.document.document_name}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={documentToView.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
