/**
 * Secure Error Handling Utilities
 *
 * This module provides secure error handling that prevents exposure of
 * technical details while maintaining useful error messages for users
 * and detailed logging for developers.
 */

/**
 * Error types for classification
 */
export const ErrorTypes = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  SERVER_ERROR: 'server_error',
  NETWORK: 'network',
  DATABASE: 'database'
};

/**
 * User-friendly error messages (no technical details)
 */
const UserErrorMessages = {
  [ErrorTypes.AUTHENTICATION]: 'Please sign in to continue.',
  [ErrorTypes.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
  [ErrorTypes.VALIDATION]: 'Please check your input and try again.',
  [ErrorTypes.NOT_FOUND]: 'The requested information could not be found.',
  [ErrorTypes.CONFLICT]: 'This action conflicts with existing data. Please refresh and try again.',
  [ErrorTypes.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [ErrorTypes.SERVER_ERROR]: 'Something went wrong. Please try again later.',
  [ErrorTypes.NETWORK]: 'Unable to connect. Please check your internet connection.',
  [ErrorTypes.DATABASE]: 'Unable to save changes. Please try again.'
};

/**
 * Classify error based on code or message
 * @param {Error} error - Error object
 * @returns {string} Error type
 */
function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toString() || '';

  // Authentication errors
  if (
    message.includes('auth') ||
    message.includes('login') ||
    message.includes('session') ||
    code === '401'
  ) {
    return ErrorTypes.AUTHENTICATION;
  }

  // Authorization errors
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    code === '403' ||
    code === '42501'
  ) {
    return ErrorTypes.AUTHORIZATION;
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('must be') ||
    message.includes('validation') ||
    code === '400' ||
    code === '22P02'
  ) {
    return ErrorTypes.VALIDATION;
  }

  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('does not exist') ||
    code === '404' ||
    code === '42P01'
  ) {
    return ErrorTypes.NOT_FOUND;
  }

  // Conflict errors
  if (
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('conflict') ||
    code === '409' ||
    code === '23505'
  ) {
    return ErrorTypes.CONFLICT;
  }

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many') ||
    code === '429'
  ) {
    return ErrorTypes.RATE_LIMIT;
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('connection') ||
    error.name === 'NetworkError'
  ) {
    return ErrorTypes.NETWORK;
  }

  // Database errors
  if (
    message.includes('database') ||
    message.includes('query') ||
    message.includes('relation') ||
    code.startsWith('23') ||
    code.startsWith('42')
  ) {
    return ErrorTypes.DATABASE;
  }

  // Default to server error
  return ErrorTypes.SERVER_ERROR;
}

/**
 * Sanitize error for user display (remove technical details)
 * @param {Error} error - Error object
 * @param {string} customMessage - Optional custom message
 * @returns {object} Sanitized error object
 */
export function sanitizeErrorForUser(error, customMessage = null) {
  const errorType = classifyError(error);
  const userMessage = customMessage || UserErrorMessages[errorType];

  // Generate a unique error ID for tracking
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    message: userMessage,
    type: errorType,
    errorId: errorId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Log error details for debugging (includes technical details)
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {object} metadata - Additional metadata
 */
export function logError(error, context = '', metadata = {}) {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    context: context,
    message: error.message,
    name: error.name,
    code: error.code,
    stack: error.stack,
    metadata: metadata
  };

  // In production, this would go to a proper logging service
  // For now, use console.error with structured data
  console.error('[ERROR]', JSON.stringify(errorDetails, null, 2));

  // In production, send to logging service
  // Example: sendToLogService(errorDetails);
}

/**
 * Handle async errors with user-friendly messages
 * @param {Promise} promise - Promise to handle
 * @param {string} context - Context description
 * @returns {Promise} Promise that resolves with [error, data]
 */
export async function handleAsync(promise, context = '') {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    logError(error, context);
    const sanitizedError = sanitizeErrorForUser(error);
    return [sanitizedError, null];
  }
}

/**
 * Create a custom error with user-friendly message
 * @param {string} message - Technical error message
 * @param {string} errorType - Error type
 * @param {string} userMessage - User-friendly message
 * @returns {Error} Enhanced error object
 */
export function createError(message, errorType = ErrorTypes.SERVER_ERROR, userMessage = null) {
  const error = new Error(message);
  error.type = errorType;
  error.userMessage = userMessage || UserErrorMessages[errorType];
  return error;
}

/**
 * Validate and handle Supabase errors
 * @param {object} supabaseResponse - Supabase response with error
 * @param {string} context - Context description
 * @returns {Error|null} Sanitized error or null
 */
export function handleSupabaseError(supabaseResponse, context = '') {
  if (!supabaseResponse.error) return null;

  const error = supabaseResponse.error;
  logError(error, `Supabase: ${context}`);

  return sanitizeErrorForUser(error);
}

/**
 * Generic error boundary handler for React components
 * @param {Error} error - Error object
 * @param {object} errorInfo - React error info
 * @returns {object} Sanitized error for display
 */
export function handleComponentError(error, errorInfo) {
  logError(error, 'React Component Error', { errorInfo });
  return sanitizeErrorForUser(error, 'An error occurred while displaying this content.');
}

/**
 * Validate response status and throw appropriate error
 * @param {Response} response - Fetch response
 * @param {string} context - Context description
 */
export async function validateResponse(response, context = '') {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');

    let errorType = ErrorTypes.SERVER_ERROR;
    if (response.status === 401) errorType = ErrorTypes.AUTHENTICATION;
    else if (response.status === 403) errorType = ErrorTypes.AUTHORIZATION;
    else if (response.status === 404) errorType = ErrorTypes.NOT_FOUND;
    else if (response.status === 409) errorType = ErrorTypes.CONFLICT;
    else if (response.status === 429) errorType = ErrorTypes.RATE_LIMIT;

    const error = createError(
      `HTTP ${response.status}: ${errorText}`,
      errorType
    );

    logError(error, context, { status: response.status });
    throw error;
  }
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {string} context - Context description
 * @returns {Promise} Result of function
 */
export async function retryWithBackoff(fn, maxRetries = 3, context = '') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        logError(error, `${context} (Failed after ${maxRetries} attempts)`);
        throw sanitizeErrorForUser(error);
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`Retry attempt ${attempt}/${maxRetries} for ${context}`);
    }
  }

  throw sanitizeErrorForUser(lastError);
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context = '') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw sanitizeErrorForUser(error);
    }
  };
}

/**
 * Check if error is a specific type
 * @param {Error} error - Error to check
 * @param {string} errorType - Error type to check against
 * @returns {boolean} True if error matches type
 */
export function isErrorType(error, errorType) {
  if (!error) return false;
  return classifyError(error) === errorType;
}

export default {
  ErrorTypes,
  sanitizeErrorForUser,
  logError,
  handleAsync,
  createError,
  handleSupabaseError,
  handleComponentError,
  validateResponse,
  retryWithBackoff,
  withErrorHandling,
  isErrorType
};
