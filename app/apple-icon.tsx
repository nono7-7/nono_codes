import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F172A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '38px',
        }}
      >
        <span
          style={{
            color: '#2DD4BF',
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: '-3px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          iT
        </span>
      </div>
    ),
    { ...size }
  );
}
