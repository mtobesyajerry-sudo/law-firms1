import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { auditService } from '../services/auditService';
import {
  responseOptions,
  riskRatingOptions,
  calculateSectionScore,
  getRiskColor,
  calculateRiskLevel,
  ATTACHMENT_DECLARATION
} from '../data/assessmentData';
import {
  getFrameworkData,
  determineEntityTier,
  getFilteredSections,
  getTierDescription,
  getQuestionCountForTier,
  calculateScores,
  getTotalQuestionCountForFramework,
  getFrameworkLabel,
  resolveFrameworkType
} from '../utils/frameworkUtils';
import { serverValidateFile } from '../utils/documentUtils';
import AssessmentIntroduction from './AssessmentIntroduction';

export default function AssessmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, hasActiveSubscription } = useAuth();
  const isReadOnly = profile?.role === 'management';
  const [assessment, setAssessment] = useState(null);
  const [responses, setResponses] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [sectionScores, setSectionScores] = useState([]);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [frameworkType, setFrameworkType] = useState('legal_professionals');
  const [entityTier, setEntityTier] = useState(2);
  const [filteredSections, setFilteredSections] = useState([]);
  const [attachments, setAttachments] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [declarationConfirmed, setDeclarationConfirmed] = useState({});
  const saveTimeoutRef = useRef({});
  const saveQueueRef = useRef(new Set());

  const currentSection = filteredSections[currentSectionIndex];
  const progress = ((currentSectionIndex + 1) / filteredSections.length) * 100;

  const navigateToDashboard = () => {
    if (!profile?.role) {
      navigate('/client/dashboard');
      return;
    }
    switch (profile.role) {
      case 'staff':
      case 'lawyer':
        navigate('/dashboard/staff');
        break;
      case 'management':
      case 'senior_partner':
        navigate('/dashboard/management');
        break;
      case 'compliance_officer':
      case 'mlro':
        navigate('/dashboard/compliance');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/client/dashboard');
    }
  };

  const getLastSavedText = () => {
    if (!lastSaved) return null;

    const now = new Date();
    const diffMs = now - lastSaved;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 10) {
      return 'Saved just now';
    } else if (diffSecs < 60) {
      return `Saved ${diffSecs} seconds ago`;
    } else if (diffMins === 1) {
      return 'Saved 1 minute ago';
    } else if (diffMins < 60) {
      return `Saved ${diffMins} minutes ago`;
    } else {
      return `Last saved at ${lastSaved.toLocaleTimeString()}`;
    }
  };

  useEffect(() => {
    loadAssessment();
  }, [id]);

  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  useEffect(() => {
    if (!lastSaved) return;

    const interval = setInterval(() => {
      setLastSaved(prev => prev ? new Date(prev) : null);
    }, 10000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  const loadAssessment = async () => {
    try {
      const { data: assessData, error: assessError } = await supabase
        .from('assessments')
        .select('*, organizations(*)')
        .eq('id', id)
        .maybeSingle();

      if (assessError) throw assessError;
      if (!assessData) {
        navigateToDashboard();
        return;
      }

      const mappedAssessData = {
        ...assessData,
        entity_category: assessData.dnfbp_category
      };
      setAssessment(mappedAssessData);

      // Only check subscription for client role users
      // Staff, compliance officers, management, and admins bypass subscription checks
      const requiresSubscription = profile?.role === 'client';
      if (requiresSubscription && !hasActiveSubscription && assessData.status !== 'completed') {
        alert('Your subscription has expired. Please contact support to renew your subscription to access assessments.');
        navigateToDashboard();
        return;
      }

      if (!assessData.disclaimer_accepted) {
        setShowDisclaimer(true);
        setLoading(false);
        return;
      }

      if (!assessData.introduction_completed) {
        setShowIntroduction(true);
        setLoading(false);
        return;
      }

      // Existing assessments carry their framework_type on the row.
      // Only fall back to the org's sector when the stored value is absent
      // (pre-dispatch rows created before this change, or new assessments not
      // yet past the introduction step).
      const framework = assessData.framework_type
        || resolveFrameworkType(assessData.organizations?.sector);
      setFrameworkType(framework);
      const tier = assessData.entity_tier || assessData.dnfbp_tier || 2;
      setEntityTier(tier);
      const sections = getFilteredSections(framework, tier);
      console.log('🔍 Loading assessment - Total modules:', sections.length);
      sections.forEach((mod, i) => {
        console.log(`  Module ${i+1}: ${mod.name} - ${mod.subsections?.length || 0} subsections`);
      });
      setFilteredSections(sections);

      const { data: responsesData, error: responsesError } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('assessment_id', id);

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

      const { data: scoresData, error: scoresError } = await supabase
        .from('section_scores')
        .select('*')
        .eq('assessment_id', id);

      if (scoresError) throw scoresError;
      setSectionScores(scoresData || []);

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('assessment_attachments')
        .select('*')
        .eq('assessment_id', id);

      if (attachmentsError) throw attachmentsError;

      const attachmentsByQuestion = {};
      (attachmentsData || []).forEach(att => {
        if (!attachmentsByQuestion[att.question_code]) {
          attachmentsByQuestion[att.question_code] = [];
        }
        attachmentsByQuestion[att.question_code].push(att);
      });
      setAttachments(attachmentsByQuestion);

    } catch (error) {
      console.error('Error loading assessment:', error);
      alert(`Error loading assessment data: ${error.message || 'Unknown error'}. Please try refreshing the page or contact support if the issue persists.`);
      navigateToDashboard();
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerAccept = async () => {
    if (!disclaimerAgreed) {
      alert('Please check the box to confirm you agree to the disclaimer before proceeding.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          disclaimer_accepted: true,
          disclaimer_accepted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setAssessment({ ...assessment, disclaimer_accepted: true });
      setShowDisclaimer(false);

      if (!assessment.introduction_completed) {
        setShowIntroduction(true);
      }
    } catch (error) {
      console.error('Error accepting disclaimer:', error);
      alert('Error saving disclaimer acceptance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleIntroductionComplete = async (introData) => {
    setSaving(true);
    try {
      const framework = resolveFrameworkType(assessment?.organizations?.sector);

      const calculatedTier = determineEntityTier(
        framework,
        introData.number_of_employees,
        introData.annual_turnover,
        introData.entity_category
      );

      const { error } = await supabase
        .from('assessments')
        .update({
          contact_person: introData.contact_person,
          contact_position: introData.contact_position,
          contact_email: introData.contact_email,
          contact_phone: introData.contact_phone,
          business_description: introData.business_description,
          number_of_employees: introData.number_of_employees,
          annual_turnover: introData.annual_turnover,
          geographical_presence: introData.geographical_presence,
          framework_type: framework,
          introduction_completed: true,
          status: 'in_progress'
        })
        .eq('id', id);

      if (error) throw error;

      setEntityTier(calculatedTier);
      const introSections = getFilteredSections(framework, calculatedTier);
      console.log('🔍 After introduction - Total modules:', introSections.length);
      introSections.forEach((mod, i) => {
        console.log(`  Module ${i+1}: ${mod.name} - ${mod.subsections?.length || 0} subsections`);
      });
      setFilteredSections(introSections);
      setAssessment({
        ...assessment,
        ...introData,
        framework_type: framework,
        entity_tier: calculatedTier,
        entity_category: introData.entity_category,
        introduction_completed: true
      });
      setShowIntroduction(false);
    } catch (error) {
      console.error('Error saving introduction:', error);
      alert('Error saving information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getResponse = (questionCode) => {
    return responses.find(r => r.question_code === questionCode);
  };

  const updateSectionScore = useCallback(async () => {
    try {
      const sectionResponses = responses.filter(r => r.section_code === currentSection.code);
      const scoreData = calculateSectionScore(sectionResponses, currentSection);

      const existingScore = sectionScores.find(s => s.section_code === currentSection.code);

      const scoreRecord = {
        assessment_id: id,
        section_code: currentSection.code,
        section_name: currentSection.name,
        total_questions: scoreData.totalCount,
        answered_questions: scoreData.answeredCount,
        risk_score: scoreData.score,
        risk_level: calculateRiskLevel(scoreData.score),
        technical_compliance_score: scoreData.technical_compliance_score || 0,
        effectiveness_score: scoreData.effectiveness_score || 0,
      };

      if (existingScore) {
        const { error } = await supabase
          .from('section_scores')
          .update(scoreRecord)
          .eq('id', existingScore.id);

        if (error) throw error;

        setSectionScores(prev => prev.map(s =>
          s.id === existingScore.id ? { ...s, ...scoreRecord } : s
        ));
      } else {
        const { data, error } = await supabase
          .from('section_scores')
          .insert([scoreRecord])
          .select()
          .single();

        if (error) throw error;
        setSectionScores(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error updating section score:', error);
    }
  }, [responses, currentSection, sectionScores, id]);

  const saveToDatabase = useCallback(async (questionCode, questionText, value, notes, questionType, existingResponse) => {
    try {
      let riskScore = 0;

      if (questionType === 'risk_rating') {
        const riskOption = riskRatingOptions.find(opt => opt.value === value);
        riskScore = riskOption ? riskOption.score : 0;
      } else if (questionType === 'text') {
        const responseOption = responseOptions.find(opt => opt.value === value);
        riskScore = responseOption ? responseOption.score : 0;
      } else {
        const responseOption = responseOptions.find(opt => opt.value === value);
        riskScore = responseOption ? responseOption.score : 0;
      }

      const responseData = {
        assessment_id: id,
        section_code: currentSection.code,
        question_code: questionCode,
        question_text: questionText,
        response: value,
        notes,
        risk_score: riskScore,
      };

      if (existingResponse) {
        const { error } = await supabase
          .from('assessment_responses')
          .update(responseData)
          .eq('id', existingResponse.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('assessment_responses')
          .insert([responseData])
          .select()
          .single();

        if (error) throw error;

        setResponses(prev => {
          const exists = prev.find(r => r.question_code === questionCode);
          if (exists) {
            return prev.map(r => r.question_code === questionCode ? { ...r, ...data } : r);
          }
          return [...prev, data];
        });
      }

      await updateSectionScore();
      saveQueueRef.current.delete(questionCode);

      if (saveQueueRef.current.size === 0) {
        setSaving(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving response:', error);
      saveQueueRef.current.delete(questionCode);
      if (saveQueueRef.current.size === 0) {
        setSaving(false);
      }
    }
  }, [id, currentSection, updateSectionScore, frameworkType]);

  const handleResponseChange = useCallback((questionCode, questionText, value, notes = '', questionType = null, isNotesOnly = false) => {
    const existingResponse = getResponse(questionCode);

    let riskScore = 0;
    if (questionType === 'risk_rating') {
      const riskOption = riskRatingOptions.find(opt => opt.value === value);
      riskScore = riskOption ? riskOption.score : 0;
    } else if (questionType === 'text') {
      const responseOption = responseOptions.find(opt => opt.value === value);
      riskScore = responseOption ? responseOption.score : 0;
    } else {
      const responseOption = responseOptions.find(opt => opt.value === value);
      riskScore = responseOption ? responseOption.score : 0;
    }

    const updatedData = {
      assessment_id: id,
      section_code: currentSection.code,
      question_code: questionCode,
      question_text: questionText,
      response: value,
      notes,
      risk_score: riskScore,
    };

    setResponses(prev => {
      if (existingResponse) {
        return prev.map(r =>
          r.id === existingResponse.id ? { ...r, ...updatedData } : r
        );
      } else {
        return [...prev, { ...updatedData, id: `temp-${questionCode}` }];
      }
    });

    if (saveTimeoutRef.current[questionCode]) {
      clearTimeout(saveTimeoutRef.current[questionCode]);
    }

    saveQueueRef.current.add(questionCode);
    setSaving(true);

    const delay = isNotesOnly ? 1000 : 300;

    saveTimeoutRef.current[questionCode] = setTimeout(() => {
      saveToDatabase(questionCode, questionText, value, notes, questionType, existingResponse);
    }, delay);
  }, [responses, id, currentSection, saveToDatabase]);

  const completeAssessment = async () => {
    setSaving(true);
    try {
      console.log('Starting assessment completion...');
      console.log('Responses:', responses);

      const responsesMap = {};
      responses.forEach(r => {
        if (r.question_code && r.response) {
          responsesMap[r.question_code] = r.response;
        }
      });

      console.log('Responses Map:', responsesMap);
      console.log('Framework Type:', frameworkType);
      console.log('Entity Tier:', entityTier);

      const scores = calculateScores(frameworkType, responsesMap, entityTier);
      console.log('Calculated scores:', scores);

      const overallRisk = scores.overallRisk || scores.residualRisk?.rating || 'MODERATE';
      console.log('Overall Risk:', overallRisk);

      const updatePayload = {
        status: 'completed',
        overall_risk_rating: typeof overallRisk === 'string' ? overallRisk : overallRisk?.level || 'MODERATE',
        overall_risk_score: typeof overallRisk === 'object' ? overallRisk.score : scores.residualRisk?.score || 0,
        completed_at: new Date().toISOString(),
        module_1_score: scores.module1?.score || 0,
        module_2_score: scores.module2?.score || 0,
        module_3_score: scores.module3?.score || 0,
        module_4_score: scores.module4?.score || 0,
        module_4_rating: scores.module4?.rating || null
      };

      console.log('Update Payload:', updatePayload);

      const { error } = await supabase
        .from('assessments')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      await auditService.logAssessmentAction('completed', id, {
        overall_risk_rating: updatePayload.overall_risk_rating,
        overall_risk_score: updatePayload.overall_risk_score,
        framework_type: frameworkType
      });

      console.log('Assessment completed successfully');
      navigate(`/report/${id}`);
    } catch (error) {
      console.error('Error completing assessment:', error);
      console.error('Error stack:', error.stack);
      alert(`Error completing assessment: ${error.message}. Please check the console for details.`);
    } finally {
      setSaving(false);
    }
  };

  const goToNextSection = () => {
    if (currentSectionIndex < filteredSections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    } else {
      completeAssessment();
    }
  };

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleFileUpload = async (questionCode, files) => {
    if (!files || files.length === 0) return;

    if (!declarationConfirmed[questionCode]) {
      alert('Please confirm the declaration before uploading files.');
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [questionCode]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Authentication required. Please sign in again.');

      const uploadedFiles = [];

      for (const file of Array.from(files)) {
        const serverValidation = await serverValidateFile(file, session.access_token);
        if (!serverValidation.valid) {
          throw new Error(`${file.name}: ${serverValidation.errors?.join(', ') || 'File validation failed'}`);
        }

        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const storagePath = `assessments/${id}/${questionCode}/${timestamp}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('client-documents')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const fileData = {
          assessment_id: id,
          question_code: questionCode,
          file_name: file.name,
          file_path: storagePath,
          storage_path: storagePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          metadata: {
            declaration_confirmed: true,
            declaration_text: ATTACHMENT_DECLARATION,
            original_filename: file.name
          }
        };

        const { data, error } = await supabase
          .from('assessment_attachments')
          .insert([fileData])
          .select()
          .single();

        if (error) {
          await supabase.storage.from('client-documents').remove([storagePath]);
          throw error;
        }

        uploadedFiles.push(data);
      }

      setAttachments(prev => ({
        ...prev,
        [questionCode]: [...(prev[questionCode] || []), ...uploadedFiles]
      }));

      alert('Files uploaded successfully');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [questionCode]: false }));
    }
  };

  const handleFileView = async (attachment) => {
    try {
      const storagePath = attachment.storage_path || attachment.file_path;

      if (!storagePath) {
        alert('File path not found');
        return;
      }

      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      if (data && data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file. Please try again.');
    }
  };

  const handleFileDelete = async (questionCode, attachmentId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const attachment = (attachments[questionCode] || []).find(att => att.id === attachmentId);

      if (attachment && attachment.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([attachment.storage_path]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      const { error } = await supabase
        .from('assessment_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      setAttachments(prev => ({
        ...prev,
        [questionCode]: (prev[questionCode] || []).filter(att => att.id !== attachmentId)
      }));

      alert('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!assessment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>Assessment not found</div>
      </div>
    );
  }

  if (showDisclaimer) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Risk Assessment System</h1>
            <p style={styles.subtitle}>Before You Begin</p>
          </div>
        </header>

        <div style={styles.disclaimerContent}>
          <div style={styles.disclaimerCompactCard}>
            <button
              onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
              style={styles.disclaimerToggle}
            >
              <div style={styles.disclaimerToggleIcon}>
                <span style={styles.warningIcon}>⚠️</span>
              </div>
              <div style={styles.disclaimerToggleContent}>
                <h3 style={styles.disclaimerToggleTitle}>Important Notice - Terms of Use</h3>
                <p style={styles.disclaimerToggleSubtitle}>
                  Click to read the full disclaimer before proceeding
                </p>
              </div>
              <div style={styles.disclaimerToggleArrow}>
                {disclaimerExpanded ? '▼' : '▶'}
              </div>
            </button>

            {disclaimerExpanded && (
              <div style={styles.disclaimerExpandedContent}>
                <div style={styles.disclaimerText}>
                  <div style={styles.disclaimerBox}>
                    <p style={styles.disclaimerMainText}>
                      <strong>System outputs depend on the accuracy and completeness of information provided by users.
                      The system does not verify all inputs. Users are solely responsible for the accuracy and integrity
                      of information supplied and for all AML/CFT/CPF compliance decisions.</strong>
                    </p>
                  </div>

                  <p style={styles.disclaimerParagraph}>
                    By proceeding with this assessment, you acknowledge that:
                  </p>

                  <ul style={styles.disclaimerList}>
                    <li style={styles.disclaimerListItem}>
                      You understand that the quality and reliability of the assessment results are directly dependent
                      on the accuracy and completeness of the information you provide.
                    </li>
                    <li style={styles.disclaimerListItem}>
                      The system performs automated calculations based on your inputs but does not independently verify
                      the accuracy of the information provided.
                    </li>
                    <li style={styles.disclaimerListItem}>
                      You are solely responsible for ensuring that all information entered is accurate, complete,
                      and up-to-date.
                    </li>
                    <li style={styles.disclaimerListItem}>
                      You are solely responsible for all compliance decisions, risk management actions, and regulatory
                      obligations related to AML/CFT/CPF requirements.
                    </li>
                    <li style={styles.disclaimerListItem}>
                      The system is a tool to assist in your compliance processes and does not replace professional
                      judgment, legal advice, or regulatory guidance.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div style={styles.disclaimerCheckbox}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={disclaimerAgreed}
                  onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>
                  I have read, understood, and agree to the above terms. I acknowledge that I am solely
                  responsible for the accuracy of information provided and all compliance decisions.
                </span>
              </label>
            </div>

            <div style={styles.disclaimerActions}>
              <button
                onClick={navigateToDashboard}
                style={styles.disclaimerCancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleDisclaimerAccept}
                disabled={!disclaimerAgreed || saving}
                style={{
                  ...styles.disclaimerAcceptButton,
                  ...(!disclaimerAgreed || saving ? styles.disclaimerButtonDisabled : {})
                }}
              >
                {saving ? 'Saving...' : 'I Agree - Proceed to Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showIntroduction) {
    return (
      <AssessmentIntroduction
        assessment={assessment}
        organization={assessment.organizations}
        onComplete={handleIntroductionComplete}
      />
    );
  }

  if (frameworkType === 'general_dnfbp' || filteredSections.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '48px 32px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '700', color: '#0a1929' }}>
            Assessment Not Configured
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#64748b', lineHeight: '1.6' }}>
            The assessment questionnaire has not yet been configured for your organisation's sector.
            Please contact your administrator to set up the assessment framework.
          </p>
          <button
            onClick={navigateToDashboard}
            style={{ padding: '10px 24px', background: '#0a1929', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerCard}>
        <div style={styles.headerContent}>
          <div>
            <div style={styles.headerTitle}>
              AML/CFT Compliance System
            </div>
            <h1 style={styles.headerSubtitle}>
              Institutional Risk Assessment
            </h1>
          </div>
          <button
            onClick={navigateToDashboard}
            style={styles.backButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.borderColor = '#d4af37';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      <div style={styles.infoCard}>
        <h2 style={styles.infoCardTitle}>
          Assessment Information
        </h2>
        <p style={{ color: '#4b5563', fontSize: '14px', margin: '0 0 20px 0', lineHeight: '1.6' }}>
          Complete the following questionnaires to assess your organization's compliance with Anti-Money Laundering (AML), Counter-Terrorist Financing (CTF) and Counter-Proliferation Financing (CPF) requirements.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.infoTable}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Assessment Level</th>
                <th style={styles.tableHeader}>Description</th>
                <th style={styles.tableHeader}>Total Questions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e8eaed' }}>
                <td style={styles.tableCell}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-block',
                    background: '#fef3c7',
                    color: '#92400e'
                  }}>
                    {entityTier === 1 ? 'Tier 1' : entityTier === 2 ? 'Tier 2' : 'Tier 3'}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {getTierDescription(frameworkType, entityTier)}
                </td>
                <td style={styles.tableCell}>
                  <strong>{getQuestionCountForTier(frameworkType, entityTier)}</strong> questions
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={styles.content}>
        <div style={styles.sectionNav}>
          {filteredSections.map((section, index) => {
            const sectionScore = sectionScores.find(s => s.section_code === section.code);
            let totalQuestions = 0;
            if (section.subsections) {
              section.subsections.forEach(sub => {
                totalQuestions += sub.questions.length;
              });
            }
            const isCompleted = sectionScore && sectionScore.answered_questions === totalQuestions;

            return (
              <button
                key={section.code}
                onClick={() => setCurrentSectionIndex(index)}
                style={{
                  ...styles.sectionNavItem,
                  ...(index === currentSectionIndex ? styles.sectionNavItemActive : {}),
                  ...(isCompleted ? styles.sectionNavItemCompleted : {})
                }}
              >
                <span style={styles.sectionCode}>{section.code.replace('MODULE_', 'M').replace('_T2', '+T2').replace('_T3', '+T3')}</span>
                <span style={styles.sectionNavText}>{section.name}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.mainContent}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>{currentSection?.name}</h2>
            <p style={styles.sectionDescription}>{currentSection?.description}</p>
          </div>

          <div style={styles.questionsContainer}>
            {currentSection?.subsections?.map((subsection, subIndex) => (
              <div key={subsection.code}>
                <div style={styles.subsectionHeader}>
                  <h3 style={styles.subsectionTitle}>{subsection.name}</h3>
                </div>
                {subsection.questions.map((question, index) => {
              const response = getResponse(question.code);
              const questionType = question.type || 'standard';
              const availableOptions = question.options ? question.options.map(opt => ({ value: opt, label: opt })) :
                                       questionType === 'risk_rating' ? riskRatingOptions :
                                       responseOptions;

              return (
                <div key={question.code} style={styles.questionCard}>
                  <div style={styles.questionHeader}>
                    <span style={styles.questionNumber}>Q{index + 1}</span>
                    <p style={styles.questionText}>{question.text}</p>
                  </div>

                  {questionType === 'text' ? (
                    <>
                      <div style={styles.effectivenessRatingSection}>
                        <p style={styles.effectivenessLabel}>Rate the quality of implementation:</p>
                        <div style={styles.responseOptions}>
                          {availableOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => !isReadOnly && handleResponseChange(
                                question.code,
                                question.text,
                                option.value,
                                response?.notes || '',
                                'text'
                              )}
                              disabled={isReadOnly}
                              style={{
                                ...styles.responseButton,
                                ...(response?.response === option.value ? styles.responseButtonActive : {}),
                                ...(isReadOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        placeholder="Provide detailed evidence and examples..."
                        value={response?.notes || ''}
                        onChange={(e) => !isReadOnly && handleResponseChange(
                          question.code,
                          question.text,
                          response?.response || '',
                          e.target.value,
                          'text',
                          true
                        )}
                        disabled={isReadOnly}
                        style={{
                          ...styles.textResponseArea,
                          ...(isReadOnly ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f3f4f6' } : {})
                        }}
                        rows={6}
                      />
                    </>
                  ) : (
                    <div style={styles.responseOptions}>
                      {availableOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => !isReadOnly && handleResponseChange(
                            question.code,
                            question.text,
                            option.value,
                            response?.notes || '',
                            questionType
                          )}
                          disabled={isReadOnly}
                          style={{
                            ...styles.responseButton,
                            ...(response?.response === option.value ? styles.responseButtonActive : {}),
                            ...(isReadOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {questionType !== 'text' && (
                    <textarea
                      placeholder="Additional notes (optional)..."
                      value={response?.notes || ''}
                      onChange={(e) => !isReadOnly && handleResponseChange(
                        question.code,
                        question.text,
                        response?.response || '',
                        e.target.value,
                        questionType,
                        true
                      )}
                      disabled={isReadOnly}
                      style={{
                        ...styles.notesInput,
                        ...(isReadOnly ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f3f4f6' } : {})
                      }}
                    />
                  )}

                  {question.requiresAttachment && (
                    <div style={styles.attachmentSection}>
                      <div style={styles.attachmentHeader}>
                        <span style={styles.attachmentLabel}>
                          {question.attachmentLabel || 'Supporting Documents'}
                        </span>
                        {question.tierRequirement && (
                          <span style={{
                            ...styles.attachmentTierBadge,
                            background: question.tierRequirement[`tier${entityTier}`] === 'mandatory' ? '#dc2626' :
                                       question.tierRequirement[`tier${entityTier}`] === 'recommended' ? '#f59e0b' : '#10b981'
                          }}>
                            {question.tierRequirement[`tier${entityTier}`]?.toUpperCase() || 'OPTIONAL'}
                          </span>
                        )}
                      </div>

                      {question.acceptableEvidence && (
                        <p style={styles.evidenceHint}>
                          <strong>Acceptable evidence:</strong> {question.acceptableEvidence}
                        </p>
                      )}

                      {question.importanceNote && (
                        <p style={styles.importanceNote}>
                          <strong>Why this matters:</strong> {question.importanceNote}
                        </p>
                      )}

                      <div style={styles.declarationBox}>
                        <label style={styles.declarationLabel}>
                          <input
                            type="checkbox"
                            checked={declarationConfirmed[question.code] || false}
                            onChange={(e) => setDeclarationConfirmed(prev => ({
                              ...prev,
                              [question.code]: e.target.checked
                            }))}
                            style={styles.declarationCheckbox}
                          />
                          <span style={styles.declarationText}>
                            {ATTACHMENT_DECLARATION}
                          </span>
                        </label>
                      </div>

                      <div style={styles.fileUploadArea}>
                        <input
                          type="file"
                          id={`file-${question.code}`}
                          multiple
                          onChange={(e) => handleFileUpload(question.code, e.target.files)}
                          style={{ display: 'none' }}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          disabled={!declarationConfirmed[question.code]}
                        />
                        <label
                          htmlFor={`file-${question.code}`}
                          style={{
                            ...styles.fileUploadButton,
                            opacity: declarationConfirmed[question.code] ? 1 : 0.5,
                            cursor: declarationConfirmed[question.code] ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {uploadingFiles[question.code] ? 'Uploading...' : '📎 Upload Files'}
                        </label>
                        <p style={styles.fileUploadHint}>
                          Accepted formats: PDF, Word, Excel, Images (Max 10MB each)
                        </p>
                      </div>

                      {attachments[question.code] && attachments[question.code].length > 0 && (
                        <div style={styles.attachmentsList}>
                          {attachments[question.code].map((att) => (
                            <div key={att.id} style={styles.attachmentItem}>
                              <div style={styles.attachmentInfo}>
                                <span style={styles.attachmentIcon}>📄</span>
                                <div>
                                  <p style={styles.attachmentName}>{att.file_name}</p>
                                  <p style={styles.attachmentMeta}>
                                    {(att.file_size / 1024).toFixed(1)} KB • {new Date(att.uploaded_at || att.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleFileView(att)}
                                  style={styles.viewButton}
                                  title="View file"
                                >
                                  👁
                                </button>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleFileDelete(question.code, att.id)}
                                    style={styles.deleteButton}
                                    title="Delete file"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
                })}
              </div>
            ))}
          </div>

          <div style={styles.navigationButtons}>
            <button
              onClick={goToPreviousSection}
              disabled={currentSectionIndex === 0}
              style={{
                ...styles.navButton,
                ...(currentSectionIndex === 0 ? styles.navButtonDisabled : {})
              }}
            >
              ← Previous Section
            </button>

            {saving ? (
              <span style={styles.savingIndicator}>
                <span style={styles.savingSpinner}>●</span> Saving...
              </span>
            ) : lastSaved ? (
              <span style={styles.savedIndicator}>
                ✓ {getLastSavedText()}
              </span>
            ) : null}

            {!isReadOnly && (
              <button
                onClick={goToNextSection}
                disabled={saving}
                style={{
                  ...styles.navButtonPrimary,
                  ...(saving ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
              >
                {saving && currentSectionIndex === filteredSections.length - 1
                  ? 'Completing...'
                  : currentSectionIndex === filteredSections.length - 1
                  ? 'Complete Assessment'
                  : 'Next Module →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
    padding: '24px'
  },
  headerCard: {
    background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: '1px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    marginBottom: '8px'
  },
  headerSubtitle: {
    margin: '0',
    fontSize: '36px',
    fontWeight: '800',
    color: 'white'
  },
  backButton: {
    padding: '12px 24px',
    background: 'transparent',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    marginBottom: '16px'
  },
  infoCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px 32px',
    border: '1px solid #d4af37',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    marginBottom: '32px'
  },
  infoCardTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 20px 0'
  },
  infoTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    padding: '10px 12px',
    textAlign: 'left',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '13px',
    borderBottom: '2px solid #d4af37',
    letterSpacing: '0.5px'
  },
  tableCell: {
    padding: '10px 12px',
    color: '#2d3748',
    fontSize: '14px'
  },
  progressBar: {
    height: '4px',
    background: '#e5e7eb',
  },
  progressFill: {
    height: '100%',
    background: '#d4af37',
    transition: 'width 0.3s ease',
  },
  subsectionHeader: {
    marginTop: '32px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #d4af37',
  },
  subsectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  content: {
    display: 'flex',
    gap: '32px',
  },
  sectionNav: {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    background: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  sectionNavItemActive: {
    borderColor: '#d4af37',
    borderWidth: '2px',
    background: '#ffffff',
    boxShadow: '0 1px 3px rgba(212,175,55,0.2)',
  },
  sectionNavItemCompleted: {
    borderColor: '#10b981',
    background: '#f0fdf4',
  },
  sectionCode: {
    minWidth: '50px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    color: '#d4af37',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: '11px',
    letterSpacing: '0.2px',
    padding: '0 8px',
    whiteSpace: 'nowrap',
  },
  sectionNavText: {
    flex: 1,
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  mainContent: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: '28px',
    background: '#ffffff',
    padding: '20px 24px',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionDescription: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.7',
    textAlign: 'justify',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  questionCard: {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  questionHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '18px',
  },
  questionNumber: {
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f9fafb',
    color: '#6b7280',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: '14px',
    flexShrink: 0,
    border: '1px solid #d1d5db',
  },
  questionText: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.6',
    textAlign: 'justify',
  },
  responseOptions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  responseButton: {
    flex: 1,
    padding: '12px 16px',
    background: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  responseButtonActive: {
    background: '#d4af37',
    borderColor: '#d4af37',
    color: '#ffffff',
    fontWeight: '700',
    boxShadow: '0 1px 3px rgba(212,175,55,0.3)',
  },
  notesInput: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '60px',
    background: '#f9fafb',
    color: '#374151',
  },
  textResponseArea: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '120px',
    lineHeight: '1.6',
    marginBottom: '8px',
    background: '#f9fafb',
    color: '#374151',
  },
  effectivenessRatingSection: {
    marginBottom: '18px',
    padding: '18px',
    background: '#fffbeb',
    borderRadius: '4px',
    border: '1px solid #fbbf24',
  },
  effectivenessLabel: {
    margin: '0 0 12px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    padding: '20px 24px',
    background: '#ffffff',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  navButton: {
    padding: '12px 28px',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  navButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  navButtonPrimary: {
    padding: '12px 28px',
    background: '#d4af37',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    boxShadow: '0 1px 3px rgba(212,175,55,0.3)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  savingIndicator: {
    color: '#f59e0b',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  savingSpinner: {
    animation: 'pulse 1.5s ease-in-out infinite',
    display: 'inline-block',
  },
  savedIndicator: {
    color: '#10b981',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#718096',
  },
  disclaimerContent: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px',
  },
  disclaimerCompactCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  disclaimerToggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '24px',
    transition: 'all 0.2s ease',
  },
  disclaimerToggleIcon: {
    flexShrink: 0,
  },
  warningIcon: {
    fontSize: '32px',
  },
  disclaimerToggleContent: {
    flex: 1,
  },
  disclaimerToggleTitle: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a202c',
  },
  disclaimerToggleSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#78350f',
  },
  disclaimerToggleArrow: {
    fontSize: '20px',
    color: '#f59e0b',
    fontWeight: '700',
    flexShrink: 0,
  },
  disclaimerExpandedContent: {
    background: '#fffbeb',
    border: '2px solid #fcd34d',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  disclaimerText: {
    margin: 0,
  },
  disclaimerParagraph: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    color: '#4a5568',
    lineHeight: '1.6',
    textAlign: 'justify',
  },
  disclaimerBox: {
    background: '#fef9c3',
    border: '2px solid #eab308',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  disclaimerMainText: {
    margin: 0,
    fontSize: '16px',
    color: '#78350f',
    lineHeight: '1.7',
    textAlign: 'justify',
  },
  disclaimerList: {
    margin: '16px 0',
    paddingLeft: '24px',
    color: '#4a5568',
  },
  disclaimerListItem: {
    marginBottom: '12px',
    fontSize: '15px',
    lineHeight: '1.6',
    textAlign: 'justify',
  },
  disclaimerCheckbox: {
    background: '#f7fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
  },
  checkboxLabel: {
    display: 'flex',
    gap: '12px',
    cursor: 'pointer',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
  },
  checkboxText: {
    fontSize: '15px',
    color: '#2d3748',
    lineHeight: '1.6',
    fontWeight: '500',
    textAlign: 'justify',
  },
  disclaimerActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  disclaimerCancelButton: {
    padding: '14px 32px',
    background: '#e2e8f0',
    color: '#2d3748',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  disclaimerAcceptButton: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    transition: 'all 0.3s ease',
  },
  disclaimerButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  attachmentSection: {
    marginTop: '20px',
    padding: '18px',
    background: '#f9fafb',
    borderRadius: '4px',
    border: '1px dashed #d1d5db',
  },
  attachmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  attachmentLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  attachmentTierBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '12px',
    letterSpacing: '0.5px',
  },
  evidenceHint: {
    fontSize: '13px',
    color: '#4a5568',
    margin: '0 0 8px 0',
    padding: '8px',
    background: '#edf2f7',
    borderRadius: '4px',
    lineHeight: '1.5',
  },
  importanceNote: {
    fontSize: '13px',
    color: '#2d3748',
    margin: '0 0 12px 0',
    padding: '8px',
    background: '#e6fffa',
    borderLeft: '3px solid #38b2ac',
    borderRadius: '4px',
    lineHeight: '1.5',
  },
  declarationBox: {
    margin: '12px 0',
    padding: '12px',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
  },
  declarationLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  declarationCheckbox: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    cursor: 'pointer',
  },
  declarationText: {
    flex: 1,
    color: '#78350f',
    fontWeight: '500',
  },
  fileUploadArea: {
    textAlign: 'center',
    padding: '12px',
  },
  fileUploadButton: {
    display: 'inline-block',
    padding: '10px 24px',
    background: '#6b7280',
    color: '#ffffff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  fileUploadHint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#718096',
  },
  attachmentsList: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachmentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  attachmentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  attachmentIcon: {
    fontSize: '24px',
  },
  attachmentName: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  attachmentMeta: {
    margin: 0,
    fontSize: '12px',
    color: '#718096',
  },
  deleteButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  viewButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#e0f2fe',
    color: '#0284c7',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
};
