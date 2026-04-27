export const prerender = false;

import type { APIRoute } from 'astro';
import scoresData from '../../../../data/scores.json';
import { envelope, errorEnvelope, apiResponse } from '../../../../lib/api';

export const GET: APIRoute = async ({ params, request }) => {
  const iso3 = params.iso3?.toUpperCase();
  const countryScores = (scoresData as any[]).filter((s) => s.iso3 === iso3);

  if (countryScores.length === 0) {
    return apiResponse(
      errorEnvelope('NOT_FOUND', `Country with ISO3 '${iso3}' not found in the cohort`),
      request,
      { status: 404, cacheTtl: 60 },
    );
  }

  return apiResponse(envelope(`scores/${iso3}`, countryScores), request, { cacheTtl: 3600 });
};
