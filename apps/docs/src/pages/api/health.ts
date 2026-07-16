import type { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
  status: 'ok';
}

export default function health(
  request: NextApiRequest,
  response: NextApiResponse<HealthResponse | { error: string }>,
) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  response.status(200).json({ status: 'ok' });
}
