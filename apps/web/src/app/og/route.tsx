import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a0533 0%, #3b0764 50%, #1a0533 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Left copy */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(236, 72, 153, 0.2)',
            border: '1px solid rgba(236, 72, 153, 0.4)',
            borderRadius: '100px',
            padding: '6px 16px',
            width: 'fit-content',
          }}>
            <span style={{ color: '#f9a8d4', fontSize: '14px', fontWeight: 600 }}>★ Con Agentes de IA</span>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '52px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
              Gestiona tu salón
            </span>
            <span style={{
              fontSize: '52px',
              fontWeight: 800,
              lineHeight: 1.1,
              background: 'linear-gradient(90deg, #f472b6, #c084fc)',
              backgroundClip: 'text',
              color: 'transparent',
            }}>
              con Inteligencia Artificial
            </span>
          </div>

          {/* Description */}
          <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', lineHeight: 1.4 }}>
            Agenda, inventario, ventas POS y agente IA Glamy para tu salón de belleza.
          </span>

          {/* CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'linear-gradient(135deg, #ec4899, #a855f7)',
            borderRadius: '12px',
            padding: '14px 28px',
            width: 'fit-content',
            marginTop: '8px',
          }}>
            <span style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>Empezar gratis — 14 días</span>
          </div>
        </div>

        {/* Right — branding */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '64px',
          }}>
            💅
          </div>
          <span style={{ color: '#ffffff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Glamorapp
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>glamorapp.com</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
