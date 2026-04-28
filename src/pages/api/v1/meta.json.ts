export const prerender = false;

import type { APIRoute } from 'astro';
import metaData from '../../../data/meta.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('meta', metaData), request, { cacheTtl: 3600 });
};
