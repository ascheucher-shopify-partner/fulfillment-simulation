import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { type EntryContext } from "react-router";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { logger, logError } from "./utils/logger.server";
import { createHttpLoggerWithTiming } from "./middleware/http-logger.server";

export const streamTimeout = 5000;

const isDevelopment = process.env.NODE_ENV === "development";

// In production, redirect console.log to Pino to ensure all logs are JSON
if (process.env.NODE_ENV === 'production') {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.log = (...args: any[]) => {
    logger.info({ source: 'console' }, args.join(' '));
  };

  console.warn = (...args: any[]) => {
    logger.warn({ source: 'console' }, args.join(' '));
  };

  console.error = (...args: any[]) => {
    logger.error({ source: 'console' }, args.join(' '));
  };
}

// Create HTTP logger instance
const httpLogger = createHttpLoggerWithTiming({
  skipPaths: [/^\/assets\//], // Skip static assets
  debugPaths: ['/health'], // Log health checks at debug level to reduce log clutter
  logHeaders: isDevelopment,
});

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  // Start HTTP request timing
  const requestTimer = httpLogger.start(request);

  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? '')
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
          requestTimer.end(responseStatusCode);
        },
        onShellError(error) {
          logError(logger, error, { context: 'shell_error', url: request.url });
          requestTimer.end(500); // Log as 500 error
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          logError(logger, error, { context: 'render_error', url: request.url });
          requestTimer.end(500); // Log as 500 error
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
