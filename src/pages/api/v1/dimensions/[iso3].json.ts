export const prerender = false;

import type { APIRoute } from 'astro';
import dimensionsData from '../../../../data/dimensions.json';
import { envelope, errorEnvelope, apiResponse } from '../../../../lib/api';

export const GET: APIRoute = async ({ params, request }) => {
  const iso3 = params.iso3?.toUpperCase();
  const countryDims = (dimensionsData as any[]).filter((d) => d.iso3 === iso3);

  if (countryDims.length === 0) {
    return apiResponse(
      errorEnvelope('NOT_FOUND', `Country with ISO3 '${iso3}' not found in the cohort`),
      request,
      { status: 404, cacheTtl: 60 },
    );
  }

  return apiResponse(envelope(`dimensions/${iso3}`, countryDims), request, { cacheTtl: 3600 });
};
