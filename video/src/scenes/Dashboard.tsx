import React from 'react';
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  spring, interpolate, Easing,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { ORANGE, ORANGE2, YELLOW, GREEN, RED, BG, BG2, BG3, TEXT, TEXT2, TEXT3, BORDER, FONT, BLUE } from '../constants';

loadFont();

const NAV_ITEMS = [
  { label: 'Dashboard', active: true,  icon: '⊞' },
  { label: 'Receitas',  active: false, icon: '$' },
  { label: 'Despesas',  active: false, icon: '▣' },
  { label: 'Metas',     active: false, icon: '◎' },
  { label: 'Relatórios',active: false, icon: '▤' },
];

const BARS = [
  { label: 'Jan', rec: 62,  desp: 40 },
  { label: 'Fev', rec: 75,  desp: 52 },
  { label: 'Mar', rec: 50,  desp: 38 },
  { label: 'Abr', rec: 88,  desp: 62 },
  { label: 'Mai', rec: 70,  desp: 44 },
  { label: 'Jun', rec: 100, desp: 68 },
];

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeIn  = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Headline
  const titleY  = interpolate(frame, [0, 30], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  // Dashboard slide up
  const dashY   = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 18, stiffness: 100 }, from: 120, to: 0 });
  const dashOp  = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // KPI cards stagger
  const kpiData = [
    { label: 'Receitas',    value: 'R$ 8.450', badge: '↑ 12%', color: GREEN,  badgeBg: 'rgba(34,197,94,0.15)' },
    { label: 'Despesas',    value: 'R$ 3.280', badge: '↑ 4%',  color: RED,    badgeBg: 'rgba(239,68,68,0.15)' },
    { label: 'Saldo Líq.', value: 'R$ 5.170', badge: '↑ 18%', color: TEXT,   badgeBg: 'rgba(34,197,94,0.15)' },
  ];

  const barProgress = interpolate(frame, [50, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fadeOut }}>
      <AbsoluteFill style={{ background: BG }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: 1200, height: 600,
        background: `radial-gradient(ellipse, rgba(255,100,0,0.1) 0%, transparent 65%)`,
        filter: 'blur(30px)',
        opacity: fadeIn,
      }} />

      {/* Headline */}
      <div style={{
        position: 'absolute', top: 80, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        opacity: fadeIn,
        transform: `translateY(${titleY}px)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.25)',
          borderRadius: 50, padding: '8px 22px',
        }}>
          <div style={{ width: 6, height: 2, background: ORANGE, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Dashboard
          </span>
        </div>
        <div style={{
          fontSize: 58, fontWeight: 800, letterSpacing: -2, color: TEXT, lineHeight: 1.1, textAlign: 'center',
        }}>
          Visão completa em tempo real
        </div>
      </div>

      {/* Dashboard mockup */}
      <div style={{
        position: 'absolute', bottom: 30, left: 80, right: 80,
        opacity: dashOp,
        transform: `translateY(${dashY}px)`,
      }}>
        <div style={{
          background: BG2, borderRadius: 20,
          border: `1px solid rgba(255,255,255,0.1)`,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 60px 120px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}>
          {/* Browser topbar */}
          <div style={{
            background: '#141414', borderBottom: `1px solid rgba(255,255,255,0.06)`,
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {[['#ff5f57'], ['#febc2e'], ['#28c840']].map(([c], i) => (
              <div key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: c }} />
            ))}
            <div style={{
              flex: 1, maxWidth: 340, margin: '0 auto',
              background: '#1c1c1c', borderRadius: 8, padding: '5px 16px',
              fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
            }}>
              app.riqfy.com.br/dashboard
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', height: 480 }}>
            {/* Sidebar */}
            <div style={{
              width: 220, background: '#0d0d0d',
              borderRight: `1px solid rgba(255,255,255,0.05)`,
              padding: '18px 12px', flexShrink: 0,
            }}>
              <div style={{ padding: '4px 10px 22px', fontSize: 22, fontWeight: 800, color: ORANGE, letterSpacing: -1 }}>
                Riq<span style={{ color: TEXT }}>Fy</span>
              </div>
              {NAV_ITEMS.map((item, i) => {
                const itemOp = interpolate(frame, [30 + i * 8, 55 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const itemX  = interpolate(frame, [30 + i * 8, 55 + i * 8], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                return (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, marginBottom: 2,
                    background: item.active ? ORANGE : 'transparent',
                    fontSize: 14, fontWeight: item.active ? 700 : 500,
                    color: item.active ? '#fff' : 'rgba(255,255,255,0.35)',
                    opacity: itemOp,
                    transform: `translateX(${itemX}px)`,
                  }}>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    {item.label}
                  </div>
                );
              })}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, padding: 28, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Dashboard</div>
                <div style={{ fontSize: 13, color: TEXT3 }}>Junho 2026</div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {kpiData.map((k, i) => {
                  const kOp = interpolate(frame, [35 + i * 10, 60 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  const kY  = interpolate(frame, [35 + i * 10, 60 + i * 10], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                  return (
                    <div key={k.label} style={{
                      background: BG3, border: `1px solid rgba(255,255,255,0.06)`,
                      borderRadius: 14, padding: '16px 18px',
                      opacity: kOp, transform: `translateY(${kY}px)`,
                    }}>
                      <div style={{ fontSize: 11, color: TEXT3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{k.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginBottom: 6 }}>{k.value}</div>
                      <div style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 20,
                        background: k.badgeBg, color: k.label === 'Despesas' ? RED : GREEN,
                      }}>
                        {k.badge}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              <div style={{
                background: BG3, border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: 14, padding: '18px 20px',
                opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Fluxo mensal — 2026</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[['Receitas', ORANGE], ['Despesas', BLUE]].map(([l, c]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: TEXT3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c as string }} />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
                  {BARS.map((b) => (
                    <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90, width: '100%' }}>
                        <div style={{
                          flex: 1, borderRadius: '4px 4px 0 0',
                          background: `linear-gradient(180deg, ${ORANGE3}, ${ORANGE})`,
                          height: `${b.rec * barProgress}%`,
                        }} />
                        <div style={{
                          flex: 1, borderRadius: '4px 4px 0 0',
                          background: `rgba(0,41,107,0.7)`,
                          height: `${b.desp * barProgress}%`,
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: TEXT3, marginTop: 6 }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
