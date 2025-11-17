/**
 * Comprehensive Error Handling Utility for Thread Creation and General Use
 * 
 * This module provides structured error logging, categorization, and tracking
 * to help developers debug and fix issues quickly.
 */

import type { Request, Response } from 'express';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  NETWORK = 'NETWORK',
  FILE_SYSTEM = 'FILE_SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',           // Minor issues, non-critical
  MEDIUM = 'MEDIUM',     // Important but not breaking
  HIGH = 'HIGH',         // Breaking functionality
  CRITICAL = 'CRITICAL', // System-wide impact
}

/**
 * Structured error context for debugging
 */
export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  operationName: string;
  inputData?: any;
  additionalInfo?: Record<string, any>;
}

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  message: string;
  stack?: string;
  context: ErrorContext;
  error?: Error;
  userMessage?: string; // User-friendly message to return
}

/**
 * Developer-friendly error class with context
 */
export class ContextualError extends Error {
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    context: Partial<ErrorContext>,
    userMessage?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ContextualError';
    this.context = {
      timestamp: new Date(),
      category: context.category || ErrorCategory.UNKNOWN,
      severity: context.severity || ErrorSeverity.MEDIUM,
      operationName: context.operationName || 'unknown',
      ...context,
    };
    this.userMessage = userMessage || 'An unexpected error occurred';
    this.originalError = originalError;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextualError);
    }
  }
}

/**
 * Log error with full context and stack trace
 */
export function logError(entry: ErrorLogEntry): void {
  const {
    message,
    stack,
    context,
    error,
    userMessage,
  } = entry;

  // Format error log with clear delimiters for easy searching
  console.error('\n' + '='.repeat(80));
  console.error(`[ERROR] ${context.category} - ${context.severity}`);
  console.error(`Operation: ${context.operationName}`);
  console.error(`Timestamp: ${context.timestamp.toISOString()}`);
  console.error('-'.repeat(80));

  // Error details
  console.error(`Message: ${message}`);
  if (userMessage) {
    console.error(`User Message: ${userMessage}`);
  }

  // Context information
  if (context.userId) {
    console.error(`User ID: ${context.userId}`);
  }
  if (context.endpoint) {
    console.error(`Endpoint: ${context.method} ${context.endpoint}`);
  }
  if (context.requestId) {
    console.error(`Request ID: ${context.requestId}`);
  }

  // Input data (sanitized for security)
  if (context.inputData) {
    console.error('\nInput Data:');
    try {
      const sanitized = sanitizeForLogging(context.inputData);
      console.error(JSON.stringify(sanitized, null, 2));
    } catch (e) {
      console.error('(Unable to stringify input data)');
    }
  }

  // Additional context
  if (context.additionalInfo) {
    console.error('\nAdditional Info:');
    try {
      console.error(JSON.stringify(context.additionalInfo, null, 2));
    } catch (e) {
      console.error('(Unable to stringify additional info)');
    }
  }

  // Stack trace
  if (stack) {
    console.error('\nStack Trace:');
    console.error(stack);
  } else if (error?.stack) {
    console.error('\nStack Trace:');
    console.error(error.stack);
  }

  console.error('='.repeat(80) + '\n');
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'password_hash',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'session',
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Categorize error based on error message and type
 */
export function categorizeError(error: Error | any): {
  category: ErrorCategory;
  severity: ErrorSeverity;
} {
  const errorMessage = (error?.message || '').toLowerCase();

  // Database errors
  if (
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('foreign key constraint') ||
    errorMessage.includes('violates') ||
    errorMessage.includes('not null') ||
    errorMessage.includes('relation') ||
    errorMessage.includes('column') ||
    error?.code === '23505' || // Unique violation
    error?.code === '23503' || // Foreign key violation
    error?.code === '23502'    // Not null violation
  ) {
    return {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
    };
  }

  // Validation errors
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    error?.name === 'ZodError' ||
    error?.name === 'ValidationError'
  ) {
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
    };
  }

  // Authentication errors
  if (
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('unauthorized') ||
    error?.code === '401'
  ) {
    return {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Authorization errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('access denied') ||
    error?.code === '403'
  ) {
    return {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Network/External service errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound')
  ) {
    return {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
    };
  }

  // File system errors
  if (
    errorMessage.includes('enoent') ||
    errorMessage.includes('eacces') ||
    errorMessage.includes('file') ||
    errorMessage.includes('directory')
  ) {
    return {
      category: ErrorCategory.FILE_SYSTEM,
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Default
  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: Error | any, operation: string): string {
  const errorMessage = (error?.message || '').toLowerCase();

  // Database constraint errors
  if (errorMessage.includes('duplicate key') && errorMessage.includes('slug')) {
    return 'A thread with this title already exists in this category. Please use a different title.';
  }

  if (errorMessage.includes('foreign key constraint')) {
    if (errorMessage.includes('category')) {
      return "The selected category doesn't exist. Please choose a valid category.";
    }
    if (errorMessage.includes('user')) {
      return 'Your session has expired. Please log in again.';
    }
    return 'Invalid data provided. Please check your inputs and try again.';
  }

  if (errorMessage.includes('not null') || errorMessage.includes('violates not-null constraint')) {
    return 'Required fields are missing. Please fill in all required information.';
  }

  if (errorMessage.includes('too long') || errorMessage.includes('value too long')) {
    return 'One or more fields exceed the maximum character limit. Please shorten your content.';
  }

  // Validation errors
  if (error?.name === 'ZodError') {
    return 'Validation failed. Please check your input and try again.';
  }

  // Authentication errors
  if (errorMessage.includes('not authenticated')) {
    return 'Please log in to continue.';
  }

  if (errorMessage.includes('user not found')) {
    return 'User account not found. Please check your credentials.';
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Generic fallback
  return `Unable to ${operation}. Please try again or contact support if the problem persists.`;
}

/**
 * Handle error in Express route with comprehensive logging
 */
export function handleRouteError(
  error: Error | any,
  req: Request,
  res: Response,
  operationName: string,
  inputData?: any
): void {
  const { category, severity } = categorizeError(error);
  const userMessage = getUserFriendlyMessage(error, operationName);

  // Build context
  const context: ErrorContext = {
    userId: (req.user as any)?.id,
    endpoint: req.path,
    method: req.method,
    requestId: (req as any).id || 'unknown',
    timestamp: new Date(),
    category,
    severity,
    operationName,
    inputData: inputData || req.body,
    additionalInfo: {
      query: req.query,
      params: req.params,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    },
  };

  // Log error with full context
  logError({
    message: error.message || 'Unknown error',
    stack: error.stack,
    context,
    error,
    userMessage,
  });

  // Determine HTTP status code
  let statusCode = 500;
  if (category === ErrorCategory.VALIDATION) statusCode = 400;
  if (category === ErrorCategory.AUTHENTICATION) statusCode = 401;
  if (category === ErrorCategory.AUTHORIZATION) statusCode = 403;
  if (errorMessage.includes('not found')) statusCode = 404;

  // Send response
  res.status(statusCode).json({
    error: userMessage,
    ...(process.env.NODE_ENV === 'development' && {
      details: {
        message: error.message,
        category,
        severity,
        stack: error.stack?.split('\n').slice(0, 5), // First 5 lines in dev
      },
    }),
  });
}

/**
 * Wrap async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: Partial<ErrorContext>,
  onError?: (error: Error) => void
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const { category, severity } = categorizeError(err);

    logError({
      message: err.message,
      stack: err.stack,
      context: {
        timestamp: new Date(),
        category,
        severity,
        operationName: context.operationName || 'unknown',
        ...context,
      },
      error: err,
    });

    if (onError) {
      onError(err);
    }

    return { success: false, error: err };
  }
}

/**
 * Log warning (non-error issues that developers should be aware of)
 */
export function logWarning(
  message: string,
  context: Partial<ErrorContext>,
  additionalInfo?: Record<string, any>
): void {
  console.warn('\n' + '~'.repeat(80));
  console.warn(`[WARNING] ${context.category || 'GENERAL'}`);
  console.warn(`Operation: ${context.operationName || 'unknown'}`);
  console.warn(`Timestamp: ${new Date().toISOString()}`);
  console.warn('-'.repeat(80));
  console.warn(`Message: ${message}`);

  if (context.userId) {
    console.warn(`User ID: ${context.userId}`);
  }

  if (additionalInfo) {
    console.warn('\nAdditional Info:');
    console.warn(JSON.stringify(additionalInfo, null, 2));
  }

  console.warn('~'.repeat(80) + '\n');
}

/**
 * Log info (helpful debugging information)
 */
export function logInfo(
  message: string,
  context: Partial<ErrorContext>,
  data?: Record<string, any>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n' + '-'.repeat(80));
    console.log(`[INFO] ${context.operationName || 'unknown'}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Message: ${message}`);

    if (data) {
      console.log('\nData:');
      console.log(JSON.stringify(sanitizeForLogging(data), null, 2));
    }

    console.log('-'.repeat(80) + '\n');
  }
}
