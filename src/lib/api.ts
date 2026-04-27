import metaData from '../data/meta.json';

/**
 * Wrap a data payload in the standard API envelope.
 */
export function envelope(endpoint: string, data: unknown) {
  return {
    version: 'v1',
    tracker_version: (metaData as any).tracker_version,
    exported_at: (metaData as any).exported_at,
    endpoint,
    data,
  };
}

/**
 * Build an error envelope.
 */
export function errorEnvelope(code: string, message: string) {
  return {
    version: 'v1',
    error: {
      code,
      message,
      request_id: crypto.randomUUID(),
    },
  };
}

/**
 * Compute a simple ETag from a JSON string.
 */
function computeETag(body: string): string {
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return `"${(hash >>> 0).toString(36)}"`;
}

/**
 * Create a JSON API Response with CORS, Cache-Control, and ETag headers.
 * Returns 304 if the client's If-None-Match matches the current ETag.
 */
export function apiResponse(
  data: unknown,
  request: Request,
  options: { cacheTtl?: number; status?: number } = {},
): Response {
  const { cacheTtl = 3600, status = 200 } = options;
  const body = JSON.stringify(data);
  const etag = computeETag(body);

  // Check If-None-Match for 304
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: corsHeaders(etag, cacheTtl),
    });
  }

  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(etag, cacheTtl),
    },
  });
}

function corsHeaders(etag: string, cacheTtl: number): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    'Cache-Control': `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    'ETag': etag,
  };
}
