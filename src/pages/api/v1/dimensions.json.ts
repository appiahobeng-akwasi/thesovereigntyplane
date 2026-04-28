export const prerender = false;

import type { APIRoute } from 'astro';
import dimensionsData from '../../../data/dimensions.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('dimensions', dimensionsData), request, { cacheTtl: 3600 });
};
