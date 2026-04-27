export const prerender = false;

import type { APIRoute } from 'astro';
import countriesData from '../../../data/countries.json';
import { envelope, apiResponse } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  return apiResponse(envelope('countries', countriesData), request, { cacheTtl: 86400 });
};
