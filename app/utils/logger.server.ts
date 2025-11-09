/**
 * Server-side logger configuration using Pino
 *
 * This logger is for BACKEND USE ONLY (React Router server-side code).
 * - Logs to CloudWatch in production (JSON format)
 * - Logs to console in development (pretty format)
 * - Integrates with Sentry for error tracking
 * - Automatically redacts PII
 *
 * DO NOT import this in browser/UI extension code - it will fail.
 * For UI extensions, use Sentry browser SDK directly.
 */

import pino from 'pino';
import * as Sentry from '@sentry/react-router';
import { createRequire } from 'node:module';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const require = createRequire(import.meta.url);
const DEV_LOG_DESTINATION = '/tmp/fulfillment-simulation-dev.log';
const devFileTransportTarget = require.resolve('./pino-dev-file-transport.cjs');


const redactConfig = {
  paths: [
    // Authentication & Authorization
    'req.headers.authorization',
    'req.headers.cookie',
    'authorization',
    'token',
    'apiKey',
    'api_key',

    // PII - Personal Information
    'password',
    'email',
    'telephone',
    'phone',
    'birthDate',
    'birth_date',
    'givenNames',
    'given_names',
    'familyName',
    'family_name',

    // PII - Address Information
    '*.address',
    '*.addressLines',
    '*.address_lines',
    'address',
    'addressLines',
    'addressCity',
    'addressState',
    'addressPostalCode',
    'addressCountry',

    // PII - Patient/Health Data
    '*.patientData',
    'patientData',
    'req.body.patientData',
    'prescriptionRequestId',
    'prescriptionId',
    'fhPatientId',
    'fhPrescriptionRequestId',

    // Request body fields
    'req.body.password',
    'req.body.email',
    'req.body.telephone',
    'req.body.patientData',
  ],
  remove: true,
} as const;

const devTransport = isDevelopment ? createDevTransportConfig() : undefined;

/**
 * Custom Pino hook to send errors to Sentry
 * This runs in the same process, avoiding the pino-sentry-transport dependency issue
 */
const sentryHook = (data: any, level: number) => {
  // Only send errors (level 50) and fatal (level 60) to Sentry
  if (level >= 50) {
    const error = data.err || new Error(data.msg || 'Unknown error');

    // Add context to Sentry
    Sentry.withScope((scope) => {
      // Add all log data as extra context
      Object.keys(data).forEach(key => {
        if (key !== 'err' && key !== 'msg' && key !== 'level' && key !== 'time') {
          scope.setExtra(key, data[key]);
        }
      });

      // Set tags for filtering
      if (data.requestId) scope.setTag('request_id', data.requestId);
      if (data.route) scope.setTag('route', data.route);
      if (data.eventType) scope.setTag('event_type', data.eventType);
      if (data.shopifyCustomerId) scope.setTag('customer_id', data.shopifyCustomerId);

      // Set user context if available
      if (data.userId || data.shopifyCustomerId) {
        scope.setUser({
          id: data.userId || data.shopifyCustomerId,
        });
      }

      // Set level
      scope.setLevel(level >= 60 ? 'fatal' : 'error');

      // Capture the error
      Sentry.captureException(error);
    });
  }
};

function createDevTransportConfig() {
  const targets = [
    {
      target: devFileTransportTarget,
      options: {
        destination: DEV_LOG_DESTINATION,
      },
    },
  ];

  try {
    const prettyTarget = require.resolve('pino-pretty');
    targets.unshift({
      level: 'debug',
      target: prettyTarget,
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });
  } catch {
    // pino-pretty not installed, stick with file-only transport
  }

  return { targets };
}

/**
 * Pino logger instance configured for backend use
 */
export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',

  // Redact sensitive data outside of development to keep prod logs safe
  redact: isDevelopment ? undefined : redactConfig,

  // Add timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Base context for all logs
  base: {
    env: process.env.NODE_ENV,
    service: 'webshop-fulfillment-shopify',
  },

  // Hooks for custom behavior
  hooks: {
    logMethod(inputArgs, method) {
      // Call Sentry hook for errors
      if (inputArgs[0] && typeof inputArgs[0] === 'object') {
        // Get numeric level value from logger instance
        const levelValue = typeof this.level === 'string'
          ? pino.levels.values[this.level]
          : Number(this.level);
        sentryHook(inputArgs[0], levelValue);
      }

      // Call original Pino log method
      return method.apply(this, inputArgs);
    },
  },

  // Transport configuration (development only)
  ...(devTransport ? { transport: devTransport } : {}),
});

/**
 * Create a child logger with additional context
 * Use this to add request-specific context that will be included in all logs
 *
 * @example
 * const requestLogger = createRequestLogger({ requestId: '123', userId: 'user-456' });
 * requestLogger.info('Processing request'); // Includes requestId and userId
 */
export function createRequestLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Type-safe logging levels
 */
export const LogLevel = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const;

/**
 * Helper to log errors with proper structure
 * Ensures errors are logged with stack traces and context
 *
 * @example
 * try {
 *   // some code
 * } catch (error) {
 *   logError(logger, error, { userId: '123', action: 'payment' });
 * }
 */
export function logError(
  loggerInstance: pino.Logger,
  error: unknown,
  context?: Record<string, any>
) {
  const errorObj = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : { error };

  loggerInstance.error({
    err: errorObj,
    ...context,
  }, error instanceof Error ? error.message : 'Unknown error');
}

/**
 * Export logger instance as default
 */
export default logger;
