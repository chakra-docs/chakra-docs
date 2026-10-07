import { ImageResponse } from 'next/og';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  OG_IMAGE_BRAND,
  OG_IMAGE_DEFAULTS,
  OG_IMAGE_EYEBROW,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from '../../lib/og-image';

/** A cacheable, fixed social card: no remote assets or arbitrary query input. */
export default async function SocialImage(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).end();
    return;
  }
  response.setHeader('Content-Type', 'image/png');
  response.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const image = new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 64,
        color: 'white',
        background: 'black',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 28 }}>{OG_IMAGE_BRAND}</div>
        <div style={{ fontSize: 20, color: '#a1a1aa' }}>{OG_IMAGE_EYEBROW}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 80, lineHeight: 1.05, letterSpacing: -3 }}>
          {OG_IMAGE_DEFAULTS.title}
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.4, color: '#a1a1aa' }}>
          {OG_IMAGE_DEFAULTS.description}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #27272a',
          paddingTop: 24,
          fontSize: 20,
        }}
      >
        <div>chakra-docs.dev</div>
        <div>By COMMUNE SOFTWARE</div>
      </div>
    </div>,
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
    },
  );
  // Pages Router Node handlers send the bytes rather than returning a Response.
  response.send(Buffer.from(await image.arrayBuffer()));
}
