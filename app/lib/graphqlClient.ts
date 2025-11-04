export type GraphQLRequest = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

export type GraphQLClient = <T>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>;

export function createGraphQLClient(
  request: GraphQLRequest,
  { context }: { context?: string } = {},
): GraphQLClient {
  const label = context ? ` in ${context}` : "";

  return async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    let response: Response;
    try {
      response = await request(query, variables ? { variables } : undefined);
    } catch (error) {
      throw await buildGraphQLException(error, label);
    }

    const json = await response.json();

    if (json.errors?.length) {
      const details = formatGraphQLErrors(json.errors);
      const message = `GraphQL error${label}${details ? `: ${details}` : ""}`;
      const enriched = new Error(message) as Error & {
        graphQLErrors?: unknown[];
      };
      enriched.graphQLErrors = json.errors;
      throw enriched;
    }

    if (!json.data) {
      throw new Error(`GraphQL response missing data${label}`);
    }

    return json.data as T;
  };
}

export function formatGraphQLErrors(errors: unknown[]): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "";
  }

  return errors
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return String(entry);
      }
      const { message, path, extensions } = entry as {
        message?: string;
        path?: unknown;
        extensions?: unknown;
      };

      const parts: string[] = [];
      if (message) {
        parts.push(message);
      }
      if (Array.isArray(path) && path.length > 0) {
        parts.push(`path=${path.join(".")}`);
      }
      if (extensions && typeof extensions === "object") {
        const code = (extensions as { code?: string }).code;
        if (code) {
          parts.push(`code=${code}`);
        }
      }

      return parts.join(" | ") || JSON.stringify(entry);
    })
    .join("; ");
}

async function buildGraphQLException(
  error: unknown,
  label: string,
): Promise<Error & { graphQLErrors?: unknown[]; responseBody?: unknown }> {
  const baseMessage = error instanceof Error ? error.message : String(error);
  let graphQLErrors: unknown[] | undefined;
  let responseBody: unknown;

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    (error as { response?: Response }).response instanceof Response
  ) {
    try {
      const cloned = (error as { response: Response }).response.clone();
      responseBody = await cloned.json();
      const candidateErrors =
        (responseBody as { errors?: unknown[] })?.errors ?? undefined;
      if (Array.isArray(candidateErrors)) {
        graphQLErrors = candidateErrors;
      }
    } catch {
      // ignore JSON parsing errors
    }
  }

  const details = graphQLErrors ? formatGraphQLErrors(graphQLErrors) : "";
  const messageParts = [`GraphQL request failed${label}`, baseMessage, details]
    .filter(Boolean)
    .join(": ");

  const enriched = new Error(messageParts) as Error & {
    graphQLErrors?: unknown[];
    responseBody?: unknown;
  };
  if (graphQLErrors) {
    enriched.graphQLErrors = graphQLErrors;
  }
  if (responseBody !== undefined) {
    enriched.responseBody = responseBody;
  }
  return enriched;
}
