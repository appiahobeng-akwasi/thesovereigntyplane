export const prerender = false;

import type { APIRoute } from 'astro';
import scoresData from '../../../data/scores.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('scores', scoresData), request, { cacheTtl: 3600 });
};
