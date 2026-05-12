import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { ORANGE, YELLOW, GREEN, BG, TEXT, TEXT2, TEXT3, FONT } from '../constants';

loadFont();

interface StatItem {
  prefix?: string;
  value: number;
  suffix: string;
  label: string;
  color: string;
  delay: number;
}

const STATS: StatItem[] = [
  { value: 500,  suffix: '+',       label: 'usuários ativos',            color: ORANGE, delay: 10 },
  { value: 98,   suffix: '%',       label: 'satisfação dos clientes',    color: GREEN,  delay: 22 },
  { value: 6,    suffix: ' módulos',label: 'integrados e sincronizados', color: YELLOW, delay: 34 },
  { value: 0,    suffix: '',        label: 'disponível 24/7',            color: TEXT,   delay: 46 },
];

const TESTIMONIALS = [
  { quote: '"Economizei R$ 800 no primeiro mês identificando gastos desnecessários."', author: 'Ana Paula', role: 'Professora', color: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  { quote: '"As recorrências automáticas salvaram meu mês. Tudo lançado sem precisar fazer nada."', author: 'Rafael Lima', role: 'Engenheiro', color: 'linear-gradient(135deg,#fdc500,#ff6400)' },
  { quote: '"Em 3 meses juntei o valor da minha meta de viagem com o sistema de metas."', author: 'Letícia Souza', role: 'Estudante', color: 'linear-gradient(135deg,#d97706,#f59e0b)' },
];

export const Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeIn  = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(frame, [0, 30], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fadeOut }}>
      <AbsoluteFill style={{ background: BG }} />

      {/* Grid bg */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 72, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        opacity: fadeIn, transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: ORANGE }}>
          Números que falam
        </div>
        <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: -2, color: TEXT, lineHeight: 1.1, textAlign: 'center' }}>
          Resultados reais,<br />decisões mais inteligentes
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        position: 'absolute', top: 280, left: 60, right: 60,
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20, overflow: 'hidden',
      }}>
        {STATS.map((s, i) => {
          const st = spring({ frame: Math.max(0, frame - s.delay), fps, config: { damping: 20, stiffness: 80 } });
          const count = s.value === 0
            ? null
            : Math.floor(interpolate(frame, [s.delay, s.delay + 60], [0, s.value], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }));
          return (
            <div key={s.label} style={{
              background: '#0f0f0f', padding: '40px 28px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              opacity: st,
              transform: `translateY(${(1 - st) * 20}px)`,
            }}>
              <div style={{
                fontSize: 52, fontWeight: 800, lineHeight: 1,
                marginBottom: 10,
                background: `linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.5) 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {s.value === 0 ? (
                  <>
                    <span style={{ WebkitTextFillColor: s.color, color: s.color }}>24</span>
                    <span style={{ fontSize: 38 }}>/7</span>
                  </>
                ) : (
                  <>
                    {count}
                    <span style={{ WebkitTextFillColor: s.color, color: s.color }}>{s.suffix}</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: 15, color: TEXT3, fontWeight: 500 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Testimonials */}
      <div style={{
        position: 'absolute', bottom: 50, left: 60, right: 60,
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18,
      }}>
        {TESTIMONIALS.map((t, i) => {
          const startFrame = 80 + i * 18;
          const op = interpolate(frame, [startFrame, startFrame + 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const y  = interpolate(frame, [startFrame, startFrame + 25], [25, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={t.author} style={{
              background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, padding: '24px 26px',
              opacity: op, transform: `translateY(${y}px)`,
            }}>
              <div style={{ fontSize: 14, color: TEXT2, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 18 }}>{t.quote}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {t.author[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t.author}</div>
                  <div style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
