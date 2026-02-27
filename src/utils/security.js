import { supabase } from '../supabaseClient';

export const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export function validatePassword(password) {
  const errors = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters long`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordRequirements.requireSpecialChars) {
    const specialCharRegex = new RegExp(`[${passwordRequirements.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  const commonPasswords = [
    'password', 'Password123!', 'Welcome123!', 'Admin123!',
    'P@ssw0rd', 'Qwerty123!', '123456', 'password123'
  ];
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getPasswordStrength(password) {
  let strength = 0;

  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  if (password.length >= 20) strength += 1;

  if (strength <= 3) return { level: 'weak', color: '#ef4444', text: 'Weak' };
  if (strength <= 5) return { level: 'medium', color: '#f59e0b', text: 'Medium' };
  if (strength <= 7) return { level: 'strong', color: '#10b981', text: 'Strong' };
  return { level: 'very-strong', color: '#059669', text: 'Very Strong' };
}

export async function logAuditEvent({
  eventType,
  eventCategory,
  targetUserId = null,
  targetTable = null,
  targetRecordId = null,
  actionDescription,
  oldValues = null,
  newValues = null,
  success = true,
  errorMessage = null
}) {
  try {
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        event_type: eventType,
        event_category: eventCategory,
        target_user_id: targetUserId,
        target_table: targetTable,
        target_record_id: targetRecordId,
        action_description: actionDescription,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_url: window.location.href,
        old_values: oldValues,
        new_values: newValues,
        success,
        error_message: errorMessage
      }]);

    if (error) {
      console.error('Error logging audit event:', error);
    }
  } catch (error) {
    console.error('Error in logAuditEvent:', error);
  }
}

export async function logLoginAttempt({
  email,
  success,
  userId = null,
  failureReason = null,
  mfaUsed = false,
  sessionId = null
}) {
  try {
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('login_history')
      .insert([{
        user_id: userId,
        email,
        success,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: failureReason,
        mfa_used: mfaUsed,
        session_id: sessionId
      }]);

    if (error) {
      console.error('Error logging login attempt:', error);
    }
  } catch (error) {
    console.error('Error in logLoginAttempt:', error);
  }
}

export async function logDocumentAccess({
  documentId,
  documentName,
  documentType,
  accessType,
  clientId = null,
  assessmentId = null
}) {
  try {
    const ipAddress = await getUserIP();

    const { error } = await supabase
      .from('document_access_logs')
      .insert([{
        document_id: documentId,
        document_name: documentName,
        document_type: documentType,
        access_type: accessType,
        client_id: clientId,
        assessment_id: assessmentId,
        ip_address: ipAddress
      }]);

    if (error) {
      console.error('Error logging document access:', error);
    }
  } catch (error) {
    console.error('Error in logDocumentAccess:', error);
  }
}

export async function createSuspiciousActivityAlert({
  userId = null,
  alertType,
  severity,
  description,
  metadata = {}
}) {
  try {
    const ipAddress = await getUserIP();

    const { error } = await supabase
      .from('suspicious_activity_alerts')
      .insert([{
        user_id: userId,
        alert_type: alertType,
        severity,
        description,
        ip_address: ipAddress,
        metadata
      }]);

    if (error) {
      console.error('Error creating suspicious activity alert:', error);
    }
  } catch (error) {
    console.error('Error in createSuspiciousActivityAlert:', error);
  }
}

export async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return 'unknown';
  }
}

export async function createSession(userId) {
  try {
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createSession:', error);
    return null;
  }
}

export async function updateSessionActivity(sessionId) {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session activity:', error);
    }
  } catch (error) {
    console.error('Error in updateSessionActivity:', error);
  }
}

export async function terminateSession(sessionId) {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error terminating session:', error);
    }
  } catch (error) {
    console.error('Error in terminateSession:', error);
  }
}

function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function checkFailedLoginAttempts(email) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('login_history')
    .select('*')
    .eq('email', email)
    .eq('success', false)
    .gte('created_at', oneHourAgo.toISOString());

  if (error) {
    console.error('Error checking failed login attempts:', error);
    return 0;
  }

  const failedAttempts = data?.length || 0;

  if (failedAttempts >= 5) {
    await createSuspiciousActivityAlert({
      alertType: 'multiple_failed_logins',
      severity: 'high',
      description: `Multiple failed login attempts detected for ${email} (${failedAttempts} attempts in the last hour)`,
      metadata: { email, failedAttempts }
    });
  }

  return failedAttempts;
}

export function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function recordConsent({
  consentType,
  documentId = null,
  documentVersion,
  consented = true,
  consentMethod = 'explicit_checkbox'
}) {
  try {
    const ipAddress = await getUserIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('user_consents')
      .insert([{
        consent_type: consentType,
        document_id: documentId,
        document_version: documentVersion,
        consented,
        consent_method: consentMethod,
        ip_address: ipAddress,
        user_agent: userAgent
      }]);

    if (error) {
      console.error('Error recording consent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in recordConsent:', error);
    return false;
  }
}

export async function hasUserConsented(userId, consentType) {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .eq('consented', true)
      .is('withdrawn_at', null)
      .order('consented_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking user consent:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasUserConsented:', error);
    return false;
  }
}
