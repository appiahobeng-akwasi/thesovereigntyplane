export const prerender = false;

import type { APIRoute } from 'astro';
import versionsData from '../../../data/versions.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('versions', versionsData), request, { cacheTtl: 3600 });
};
