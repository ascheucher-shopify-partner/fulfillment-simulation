/**
 * Pino HTTP Request Logging Middleware
 *
 * Replaces React Router's default HTTP access logs with structured Pino logs.
 * Logs all HTTP requests in JSON format for better CloudWatch integration.
 *
 * GOOD Format (Pino JSON):
 * {
 *   "level": 30,
 *   "time": "2025-10-21T18:00:36.815Z",
 *   "env": "production",
 *   "service": "webshop-fulfillment-shopify",
 *   "method": "POST",
 *   "url": "/api/foundationhealth/webhooks",
 *   "status": 200,
 *   "duration": 44.215,
 *   "msg": "POST /api/foundationhealth/webhooks 200"
 * }
 *
 * BAD Format (Default HTTP logger):
 * POST /api/foundationhealth/webhooks 200 - - 44.215 ms
 * GET /health 200 - - 3.025 ms
 */

import { logger } from '../utils/logger.server';

export interface HttpLoggerOptions {
  /**
   * Paths to skip logging (e.g., health checks)
   * Use exact matches or regex patterns
   */
  skipPaths?: Array<string | RegExp>;

  /**
   * Paths to log at debug level instead of info
   * Use exact matches or regex patterns
   */
  debugPaths?: Array<string | RegExp>;

  /**
   * Whether to log request/response headers
   * Default: false (for security/privacy)
   */
  logHeaders?: boolean;

  /**
   * Whether to log request body
   * Default: false (sensitive data + large payloads)
   */
  logBody?: boolean;
}

/**
 * Create HTTP request logger middleware for React Router
 *
 * This middleware intercepts all HTTP requests and logs them using Pino
 * in structured JSON format instead of the default HTTP access log format.
 *
 * @example
 * // In server entry point:
 * import { createHttpLogger } from './middleware/http-logger.server';
 *
 * const httpLogger = createHttpLogger({
 *   skipPaths: ['/health', /^\/assets\//],
 * });
 *
 * // Use in request handler
 * export default function handleRequest(request: Request, ...args) {
 *   httpLogger(request);
 *   // ... rest of handler
 * }
 */
const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-shopify-hmac-sha256',
  'x-shopify-topic-signature',
  'x-shopify-product-signature',
  'x-shopify-access-token',
  'x-foundationhealth-signature',
  'x-fh-signature',
  'x-api-key',
]);

export function createHttpLogger(options: HttpLoggerOptions = {}) {
  const { skipPaths = [], debugPaths = [], logHeaders = false, logBody = false } = options;

  return function logHttpRequest(
    request: Request,
    responseStatusCode: number,
    duration?: number
  ) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Check if we should skip this path
    const shouldSkip = skipPaths.some((pattern) => {
      if (typeof pattern === 'string') {
        return pathname === pattern;
      }
      return pattern.test(pathname);
    });

    if (shouldSkip) {
      return;
    }

    // Check if this path should be logged at debug level
    const isDebugPath = debugPaths.some((pattern) => {
      if (typeof pattern === 'string') {
        return pathname === pattern;
      }
      return pattern.test(pathname);
    });

    // Build log context
    const logContext: Record<string, any> = {
      method,
      url: pathname,
      query: url.search || undefined,
      status: responseStatusCode,
      duration,
      userAgent: request.headers.get('user-agent') || undefined,
      referer: request.headers.get('referer') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    };

    // Optional: Add headers if configured
    if (logHeaders) {
      logContext.headers = sanitizeHeaders(request.headers);
    }

    const message = `${method} ${pathname} ${responseStatusCode}`;

    // If this is a debug path, always log at debug level
    if (isDebugPath) {
      logger.debug(logContext, message);
      return;
    }

    // Otherwise, determine log level based on status code
    const logLevel = getLogLevel(responseStatusCode);

    // Log using appropriate level
    if (logLevel === 'error') {
      logger.error(logContext, message);
    } else if (logLevel === 'warn') {
      logger.warn(logContext, message);
    } else {
      logger.info(logContext, message);
    }
  };
}

/**
 * Determine log level based on HTTP status code
 * - 5xx: error
 * - 4xx (except 404): warn
 * - Everything else: info
 */
function getLogLevel(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) {
    return 'error';
  }
  if (statusCode >= 400 && statusCode !== 404) {
    return 'warn';
  }
  return 'info';
}

/**
 * Middleware function that can be used in React Router request handler
 * This version includes timing information
 */
export function createHttpLoggerWithTiming(options: HttpLoggerOptions = {}) {
  const logHttpRequest = createHttpLogger(options);

  return {
    /**
     * Call this at the start of request handling
     */
    start: (request: Request) => {
      const startTime = performance.now();
      return {
        /**
         * Call this after response is ready
         */
        end: (responseStatusCode: number) => {
          const duration = performance.now() - startTime;
          logHttpRequest(request, responseStatusCode, duration);
        },
      };
    },
  };
}

function sanitizeHeaders(headers: Headers) {
  const sanitized: Record<string, string> = {};
  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    sanitized[key] = SENSITIVE_HEADER_KEYS.has(normalizedKey) ? '[redacted]' : value;
  });
  return sanitized;
}
