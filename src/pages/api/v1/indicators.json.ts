export const prerender = false;

import type { APIRoute } from 'astro';
import indicatorsData from '../../../data/indicators.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('indicators', indicatorsData), request, { cacheTtl: 86400 });
};
