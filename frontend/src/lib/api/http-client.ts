const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:3000';

export interface ApiErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly cooldownUntil?: string;
  };
}

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly retryAfterSeconds: number | null = null,
    public readonly cooldownUntil: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body'> {
  readonly body?: unknown;
  readonly accessToken?: string;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    accessToken,
    headers: initialHeaders,
    ...requestOptions
  } = options;

  const headers = new Headers(
    initialHeaders,
  );

  if (
    body !== undefined &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  if (
    accessToken !== undefined
  ) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...requestOptions,
      headers,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );

  if (!response.ok) {
    let errorBody:
      ApiErrorBody | undefined;

    try {
      errorBody =
        (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = undefined;
    }

    throw new ApiError(
      response.status,
      errorBody?.error?.code,
      errorBody?.error?.message ??
        'Request failed',
      parseRetryAfterHeader(
        response.headers.get('Retry-After'),
      ),
      typeof errorBody?.error?.cooldownUntil === 'string'
        ? errorBody.error.cooldownUntil
        : null,
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  const data =
    (await response.json()) as T;

  return data;
}

export function parseRetryAfterHeader(
  value: string | null,
  nowMilliseconds = Date.now(),
): number | null {
  if (value === null) return null;

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }

  if (!/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(normalized)) {
    return null;
  }

  const retryAt = Date.parse(normalized);
  if (!Number.isFinite(retryAt)) return null;

  return Math.max(
    0,
    Math.ceil((retryAt - nowMilliseconds) / 1_000),
  );
}
