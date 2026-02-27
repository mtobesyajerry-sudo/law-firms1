/**
 * Input Sanitization and XSS Protection Utilities
 *
 * This module provides comprehensive input sanitization to prevent XSS attacks
 * and ensure data integrity throughout the application.
 */

/**
 * Sanitizes HTML by escaping dangerous characters
 * @param {string} html - Raw HTML string
 * @returns {string} Escaped HTML safe for display
 */
export function escapeHtml(html) {
  if (typeof html !== 'string') return '';

  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return html.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * Sanitizes user input by removing potentially dangerous content
 * @param {string} input - User input string
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol
  sanitized = sanitized.replace(/data:/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');

  return sanitized.trim();
}

/**
 * Sanitizes text input (removes HTML tags entirely)
 * @param {string} text - Text input
 * @returns {string} Plain text with HTML removed
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';

  // Remove all HTML tags
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validates and sanitizes email addresses
 * @param {string} email - Email address
 * @returns {string|null} Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return null;

  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Sanitizes URLs and validates protocols
 * @param {string} url - URL string
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;

  const sanitized = url.trim();

  // Only allow http, https, and mailto protocols
  const allowedProtocols = ['http://', 'https://', 'mailto:'];
  const hasAllowedProtocol = allowedProtocols.some(protocol =>
    sanitized.toLowerCase().startsWith(protocol)
  );

  if (!hasAllowedProtocol) return null;

  // Remove javascript:, data:, vbscript: protocols if somehow present
  if (/^(javascript|data|vbscript):/i.test(sanitized)) return null;

  return sanitized;
}

/**
 * Sanitizes numeric input
 * @param {any} value - Input value
 * @returns {number|null} Sanitized number or null if invalid
 */
export function sanitizeNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Sanitizes integer input
 * @param {any} value - Input value
 * @returns {number|null} Sanitized integer or null if invalid
 */
export function sanitizeInteger(value) {
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Sanitizes boolean input
 * @param {any} value - Input value
 * @returns {boolean} Sanitized boolean value
 */
export function sanitizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

/**
 * Sanitizes UUID input
 * @param {string} uuid - UUID string
 * @returns {string|null} Sanitized UUID or null if invalid
 */
export function sanitizeUuid(uuid) {
  if (typeof uuid !== 'string') return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sanitized = uuid.trim().toLowerCase();

  return uuidRegex.test(sanitized) ? sanitized : null;
}

/**
 * Sanitizes JSON input
 * @param {any} json - JSON input
 * @returns {object|null} Parsed and sanitized JSON or null if invalid
 */
export function sanitizeJson(json) {
  try {
    if (typeof json === 'string') {
      return JSON.parse(json);
    }
    if (typeof json === 'object' && json !== null) {
      return json;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitizes SQL input to prevent SQL injection
 * Note: Always use parameterized queries, this is a backup defense
 * @param {string} input - SQL input
 * @returns {string} Sanitized input
 */
export function sanitizeSqlInput(input) {
  if (typeof input !== 'string') return '';

  // Remove common SQL injection patterns
  let sanitized = input.replace(/[;'"\\]/g, '');
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');

  return sanitized.trim();
}

/**
 * Sanitizes file names to prevent path traversal
 * @param {string} filename - File name
 * @returns {string} Sanitized file name
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return '';

  // Remove path separators and parent directory references
  let sanitized = filename.replace(/[\/\\]/g, '');
  sanitized = sanitized.replace(/\.\./g, '');

  // Remove special characters except alphanumeric, dash, underscore, and period
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 200);
    sanitized = `${name}.${ext}`;
  }

  return sanitized;
}

/**
 * Sanitizes object by recursively sanitizing all string values
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates assessment data
 * @param {object} data - Assessment data
 * @returns {object} Validated and sanitized data
 */
export function validateAssessmentData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid assessment data');
  }

  const validated = {};

  // Sanitize organization_id
  if (data.organization_id) {
    validated.organization_id = sanitizeUuid(data.organization_id);
    if (!validated.organization_id) {
      throw new Error('Invalid organization ID');
    }
  }

  // Sanitize text fields
  if (data.institution_name) {
    validated.institution_name = sanitizeText(data.institution_name);
  }

  if (data.assessment_date) {
    validated.assessment_date = sanitizeText(data.assessment_date);
  }

  // Sanitize numeric scores
  if (data.module_1_score !== undefined) {
    validated.module_1_score = sanitizeNumber(data.module_1_score);
    if (validated.module_1_score !== null &&
        (validated.module_1_score < 1.0 || validated.module_1_score > 5.0)) {
      throw new Error('Module 1 score must be between 1.0 and 5.0');
    }
  }

  if (data.module_2_score !== undefined) {
    validated.module_2_score = sanitizeNumber(data.module_2_score);
    if (validated.module_2_score !== null &&
        (validated.module_2_score < 1.0 || validated.module_2_score > 5.0)) {
      throw new Error('Module 2 score must be between 1.0 and 5.0');
    }
  }

  if (data.module_3_score !== undefined) {
    validated.module_3_score = sanitizeNumber(data.module_3_score);
    if (validated.module_3_score !== null &&
        (validated.module_3_score < 1.0 || validated.module_3_score > 5.0)) {
      throw new Error('Module 3 score must be between 1.0 and 5.0');
    }
  }

  if (data.module_4_score !== undefined) {
    validated.module_4_score = sanitizeNumber(data.module_4_score);
    if (validated.module_4_score !== null &&
        (validated.module_4_score < 1.0 || validated.module_4_score > 5.0)) {
      throw new Error('Module 4 score must be between 1.0 and 5.0');
    }
  }

  return validated;
}

/**
 * Content Security Policy (CSP) helper
 * @returns {string} CSP header value
 */
export function getCSPHeader() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

export default {
  escapeHtml,
  sanitizeInput,
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeInteger,
  sanitizeBoolean,
  sanitizeUuid,
  sanitizeJson,
  sanitizeSqlInput,
  sanitizeFilename,
  sanitizeObject,
  validateAssessmentData,
  getCSPHeader
};
