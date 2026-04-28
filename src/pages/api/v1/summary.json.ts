export const prerender = false;

import type { APIRoute } from 'astro';
import summaryData from '../../../data/summary.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('summary', summaryData), request, { cacheTtl: 3600 });
};
