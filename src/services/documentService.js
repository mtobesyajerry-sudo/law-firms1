import { supabase } from '../supabaseClient';
import CryptoJS from 'crypto-js';

const STORAGE_BUCKET = 'secure-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

export class DocumentService {
  static async validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static async calculateChecksum(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static generateStoragePath(organizationId, clientId, documentType, fileName) {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${organizationId}/${clientId}/${documentType}/${timestamp}_${sanitizedFileName}`;
  }

  static async uploadDocument({
    file,
    documentTypeId,
    clientId,
    assessmentId = null,
    organizationId,
    classification = 'confidential',
    requiresMFA = true,
    watermarkText = null,
    metadata = {}
  }) {
    try {
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const checksum = await this.calculateChecksum(file);

      const { data: documentType } = await supabase
        .from('document_types')
        .select('code, name, category')
        .eq('id', documentTypeId)
        .single();

      const storagePath = this.generateStoragePath(
        organizationId,
        clientId,
        documentType?.code || 'general',
        file.name
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const { data: clientDoc, error: clientDocError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          organization_id: organizationId,
          document_type_id: documentTypeId,
          document_type: documentType?.name || 'General Document',
          document_category: documentType?.category || 'other',
          document_name: file.name,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          mime_type: file.type,
          storage_path: storagePath,
          file_url: publicUrl,
          uploaded_by: user.id,
          verification_status: 'pending',
          metadata: {
            ...metadata,
            checksum,
            classification,
            watermarked: !!watermarkText,
            watermark_text: watermarkText
          }
        })
        .select()
        .single();

      if (clientDocError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw clientDocError;
      }

      await this.logDocumentAccess({
        documentId: clientDoc.id,
        documentName: file.name,
        documentType: documentType?.name,
        accessType: 'upload',
        clientId: clientId,
        assessmentId: assessmentId
      });

      return {
        success: true,
        documentId: clientDoc.id,
        storagePath: storagePath
      };
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  static async uploadAssessmentDocument({
    file,
    assessmentId,
    organizationId,
    documentCategory = 'compliance',
    classification = 'confidential',
    metadata = {}
  }) {
    try {
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const checksum = await this.calculateChecksum(file);

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${organizationId}/assessments/${assessmentId}/${documentCategory}/${timestamp}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const { data: attachment, error: attachmentError } = await supabase
        .from('assessment_attachments')
        .insert({
          assessment_id: assessmentId,
          question_code: documentCategory,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          secure_document_id: null,
          metadata: {
            ...metadata,
            checksum,
            classification,
            category: documentCategory,
            public_url: publicUrl
          }
        })
        .select()
        .single();

      if (attachmentError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw attachmentError;
      }

      await this.logDocumentAccess({
        documentId: attachment.id,
        documentName: file.name,
        documentType: documentCategory,
        accessType: 'upload',
        assessmentId: assessmentId
      });

      return {
        success: true,
        documentId: attachment.id,
        storagePath: storagePath
      };
    } catch (error) {
      console.error('Assessment document upload error:', error);
      throw error;
    }
  }

  static async downloadDocument(documentId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let document = null;
      let storagePath = null;

      const { data: clientDoc } = await supabase
        .from('client_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (clientDoc) {
        document = clientDoc;
        storagePath = clientDoc.storage_path;
      } else {
        const { data: assessmentDoc } = await supabase
          .from('assessment_attachments')
          .select('*')
          .eq('id', documentId)
          .single();

        if (assessmentDoc) {
          document = assessmentDoc;
          storagePath = assessmentDoc.file_path;
        }
      }

      if (!document) {
        throw new Error('Document not found');
      }

      if (!storagePath) {
        throw new Error('Document has no storage path');
      }

      const { data: signedUrl, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60);

      if (urlError) throw urlError;

      await this.logDocumentAccess({
        documentId: documentId,
        documentName: document.document_name || document.file_name,
        documentType: document.document_type || document.question_code,
        accessType: 'download',
        clientId: document.client_id,
        assessmentId: document.assessment_id
      });

      return signedUrl.signedUrl;
    } catch (error) {
      console.error('Document download error:', error);
      throw error;
    }
  }

  static async viewDocument(documentId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let document = null;
      let storagePath = null;

      const { data: clientDoc } = await supabase
        .from('client_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (clientDoc) {
        document = clientDoc;
        storagePath = clientDoc.storage_path;
      } else {
        const { data: assessmentDoc } = await supabase
          .from('assessment_attachments')
          .select('*')
          .eq('id', documentId)
          .single();

        if (assessmentDoc) {
          document = {
            ...assessmentDoc,
            document_name: assessmentDoc.file_name,
            mime_type: assessmentDoc.file_type
          };
          storagePath = assessmentDoc.file_path;
        }
      }

      if (!document) {
        throw new Error('Document not found');
      }

      if (!storagePath) {
        throw new Error('Document has no storage path');
      }

      const { data: signedUrl, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60);

      if (urlError) throw urlError;

      await this.logDocumentAccess({
        documentId: documentId,
        documentName: document.document_name || document.file_name,
        documentType: document.document_type || document.question_code,
        accessType: 'view',
        clientId: document.client_id,
        assessmentId: document.assessment_id
      });

      return {
        url: signedUrl.signedUrl,
        document: document
      };
    } catch (error) {
      console.error('Document view error:', error);
      throw error;
    }
  }

  static async deleteDocument(documentId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let document = null;
      let storagePath = null;
      let isAssessmentDoc = false;

      const { data: clientDoc } = await supabase
        .from('client_documents')
        .select('storage_path, client_id, document_name')
        .eq('id', documentId)
        .single();

      if (clientDoc) {
        document = clientDoc;
        storagePath = clientDoc.storage_path;
      } else {
        const { data: assessmentDoc } = await supabase
          .from('assessment_attachments')
          .select('file_path, assessment_id, file_name')
          .eq('id', documentId)
          .single();

        if (assessmentDoc) {
          document = {
            document_name: assessmentDoc.file_name,
            assessment_id: assessmentDoc.assessment_id
          };
          storagePath = assessmentDoc.file_path;
          isAssessmentDoc = true;
        }
      }

      if (!document) {
        throw new Error('Document not found');
      }

      const tableName = isAssessmentDoc ? 'assessment_attachments' : 'client_documents';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      if (storagePath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      }

      await this.logDocumentAccess({
        documentId: documentId,
        documentName: document.document_name || 'Unknown',
        documentType: 'deletion',
        accessType: 'delete',
        clientId: document.client_id,
        assessmentId: document.assessment_id
      });

      return { success: true };
    } catch (error) {
      console.error('Document deletion error:', error);
      throw error;
    }
  }

  static async getClientDocuments(clientId) {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select(`
          *,
          document_type:document_types(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const uploaderIds = [...new Set(data.map(d => d.uploaded_by).filter(Boolean))];

        if (uploaderIds.length > 0) {
          const { data: uploaders } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', uploaderIds);

          const uploaderMap = {};
          if (uploaders) {
            uploaders.forEach(u => {
              uploaderMap[u.id] = u;
            });
          }

          data.forEach(doc => {
            if (doc.uploaded_by && uploaderMap[doc.uploaded_by]) {
              doc.uploader = uploaderMap[doc.uploaded_by];
            }
          });
        }
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching client documents:', error);
      throw error;
    }
  }

  static async getAssessmentDocuments(assessmentId) {
    try {
      const { data, error } = await supabase
        .from('assessment_attachments')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getAssessmentDocuments query:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const uploaderIds = [...new Set(data.map(d => d.uploaded_by).filter(Boolean))];
      let uploaderMap = {};

      if (uploaderIds.length > 0) {
        const { data: uploaders } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', uploaderIds);

        if (uploaders) {
          uploaders.forEach(u => {
            uploaderMap[u.id] = u;
          });
        }
      }

      const formattedData = data.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_size: doc.file_size,
        file_type: doc.file_type,
        created_at: doc.created_at,
        uploaded_at: doc.uploaded_at,
        uploader: uploaderMap[doc.uploaded_by] || null,
        secure_document_id: doc.id,
        secure_document: {
          document_type: doc.question_code,
          storage_path: doc.file_path || doc.storage_path
        }
      }));

      return formattedData;
    } catch (error) {
      console.error('Error fetching assessment documents:', error);
      return [];
    }
  }

  static async verifyDocument(documentId, status, notes = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData = {
        verification_status: status,
        verified_by: user.id,
        verification_notes: notes,
        verification_date: new Date().toISOString()
      };

      const { error } = await supabase
        .from('client_documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) {
        console.error('Update error details:', error);
        throw error;
      }

      await this.logDocumentAccess({
        documentId: documentId,
        documentName: 'Document Verification',
        documentType: 'verification',
        accessType: 'verify'
      });

      return { success: true };
    } catch (error) {
      console.error('Document verification error:', error);
      throw error;
    }
  }

  static async logDocumentAccess({
    documentId,
    documentName,
    documentType,
    accessType,
    clientId = null,
    assessmentId = null
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('document_access_logs').insert({
        user_id: user?.id,
        document_id: documentId,
        document_name: documentName,
        document_type: documentType,
        access_type: accessType,
        client_id: clientId,
        assessment_id: assessmentId,
        ip_address: 'client-ip'
      });
    } catch (error) {
      console.error('Error logging document access:', error);
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  static getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('zip')) return '📦';
    return '📎';
  }
}
