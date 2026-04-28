export const prerender = false;

import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import indicatorsData from '../../../data/indicators.json';

// --- Simple in-memory rate limiter ---

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_HOUR = 100;

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const minuteKey = `${ip}:minute`;
  const hourKey = `${ip}:hour`;

  let minuteBucket = rateBuckets.get(minuteKey);
  if (!minuteBucket || now > minuteBucket.resetAt) {
    minuteBucket = { count: 0, resetAt: now + 60_000 };
    rateBuckets.set(minuteKey, minuteBucket);
  }

  let hourBucket = rateBuckets.get(hourKey);
  if (!hourBucket || now > hourBucket.resetAt) {
    hourBucket = { count: 0, resetAt: now + 3_600_000 };
    rateBuckets.set(hourKey, hourBucket);
  }

  if (minuteBucket.count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, retryAfter: Math.ceil((minuteBucket.resetAt - now) / 1000) };
  }
  if (hourBucket.count >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((hourBucket.resetAt - now) / 1000) };
  }

  minuteBucket.count++;
  hourBucket.count++;
  return { allowed: true };
}

// --- Telemetry ---

const telemetryLog: Array<{
  timestamp: string;
  ip_hash: string;
  country: string;
  indicator_code: string;
  response_time_ms: number;
}> = [];

function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash + ip.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// --- CORS preflight ---

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// --- POST handler ---

export const POST: APIRoute = async ({ request }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Check API key availability
  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        version: 'v1',
        error: { code: 'SERVICE_UNAVAILABLE', message: 'AI suggestion service is not configured' },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  // Rate limiting
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        version: 'v1',
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Try again in ${rateCheck.retryAfter} seconds.`,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter),
          ...corsHeaders,
        },
      },
    );
  }

  // Parse request
  let body: { country?: string; iso3?: string; indicator_code?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        version: 'v1',
        error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON with country and indicator_code fields' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const { country, indicator_code } = body;
  if (!country || !indicator_code) {
    return new Response(
      JSON.stringify({
        version: 'v1',
        error: { code: 'BAD_REQUEST', message: 'Both "country" and "indicator_code" fields are required' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  // Look up indicator definition
  const indicator = (indicatorsData as any[]).find((ind) => ind.indicator_code === indicator_code);
  if (!indicator) {
    return new Response(
      JSON.stringify({
        version: 'v1',
        error: { code: 'NOT_FOUND', message: `Indicator '${indicator_code}' not found` },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  // Build prompt
  const prompt = `You are scoring a country on the Sovereignty Plane v2.2 framework. The rubric uses a 0-3 ordinal scale:

- 0 (Absent): no evidence of activity, policy, or capability
- 1 (Nascent): draft, announced, or limited pilot
- 2 (Enacted/Partial): formally adopted with partial operation
- 3 (Operational/Comprehensive): fully operational with documented practice

Confidence levels:
- High: multiple independent sources confirm; score is unlikely to change with more evidence
- Medium: one credible source or strong inference; score could shift by 1 point
- Low: indirect evidence or older data; score could shift by 1-2 points

Apply the rubric strictly. Cite a primary or authoritative secondary source URL where possible. If you cannot find recent evidence, score conservatively (0 or 1) rather than guessing.

Indicator: ${indicator.indicator_code} — ${indicator.indicator}
Axis: ${indicator.axis}
Dimension: ${indicator.dimension}

Score ${country} on this indicator. Current date context: April 2026.

Return ONLY valid JSON with this exact structure (no markdown, no code fences, no explanation):
{"score": 0, "confidence": "Medium", "justification": "one sentence max 25 words", "source_url": "https://... or empty string"}`;

  // Call Gemini
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code fences if present
      const jsonText = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const parsed = JSON.parse(jsonText);

      // Log telemetry
      telemetryLog.push({
        timestamp: new Date().toISOString(),
        ip_hash: hashIp(ip),
        country,
        indicator_code,
        response_time_ms: Date.now() - startTime,
      });

      if (telemetryLog.length > 10000) telemetryLog.splice(0, telemetryLog.length - 5000);

      return new Response(
        JSON.stringify({
          version: 'v1',
          endpoint: 'suggest',
          data: parsed,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    } catch {
      if (attempt === 1) {
        return new Response(
          JSON.stringify({
            version: 'v1',
            error: { code: 'AI_ERROR', message: 'AI suggestion unavailable. Score manually.' },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }
    }
  }

  return new Response(
    JSON.stringify({
      version: 'v1',
      error: { code: 'AI_ERROR', message: 'AI suggestion unavailable. Score manually.' },
    }),
    { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
};
