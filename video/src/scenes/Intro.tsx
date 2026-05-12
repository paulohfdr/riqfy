import React from 'react';
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  spring, interpolate, Easing,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { ORANGE, ORANGE2, YELLOW, TEXT, TEXT2, TEXT3, FONT, BG } from '../constants';

loadFont();

const FADE_OUT_START = 155;

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const globalOpacity = interpolate(
    frame,
    [FADE_OUT_START, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }
  );

  // Logo spring
  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, from: 0.4, to: 1 });
  const logoOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // Tagline
  const tagY = interpolate(frame, [20, 50], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const tagOp = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Sub text
  const subY = interpolate(frame, [40, 70], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const subOp = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Glow pulse
  const glowScale = interpolate(frame, [0, 60, 120], [0.8, 1.1, 0.9], { extrapolateRight: 'clamp' });
  const glowOp    = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Eyebrow badge
  const badgeOp = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const badgeY  = interpolate(frame, [10, 35], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  // Particles
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 50 + Math.cos((i / 8) * Math.PI * 2) * 520,
    y: 50 + Math.sin((i / 8) * Math.PI * 2) * 280,
    delay: i * 10,
    size: i % 2 === 0 ? 6 : 4,
  }));

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily: FONT }}>
      {/* Background */}
      <AbsoluteFill style={{ background: BG }} />

      {/* Grid */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Glow central */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 900, height: 640,
          background: `radial-gradient(ellipse, rgba(255,100,0,0.18) 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: `scale(${glowScale})`,
          opacity: glowOp,
          filter: 'blur(40px)',
        }} />
      </AbsoluteFill>

      {/* Particles */}
      {particles.map((p, i) => {
        const pop = interpolate(frame, [p.delay, p.delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.x / 19.2}%`,
            top: `${p.y / 10.8}%`,
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? YELLOW : 'rgba(255,255,255,0.3)',
            opacity: pop * 0.6,
            boxShadow: `0 0 ${p.size * 4}px ${i % 3 === 0 ? ORANGE : YELLOW}`,
          }} />
        );
      })}

      {/* Content */}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>

        {/* Eyebrow badge */}
        <div style={{
          opacity: badgeOp,
          transform: `translateY(${badgeY}px)`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,100,0,0.12)',
          border: '1px solid rgba(255,100,0,0.3)',
          borderRadius: 50, padding: '10px 24px',
          marginBottom: 40,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#ff9a4d', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Sistema financeiro completo
          </span>
        </div>

        {/* Logo wordmark */}
        <div style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            fontSize: 130,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1,
            background: `linear-gradient(135deg, ${TEXT} 0%, rgba(255,255,255,0.7) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Riq<span style={{
              background: `linear-gradient(135deg, ${ORANGE} 0%, ${YELLOW} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Fy</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, marginTop: 24 }}>
          <div style={{
            fontSize: 42, fontWeight: 700, color: TEXT2,
            letterSpacing: -0.5, textAlign: 'center',
          }}>
            Controle total das suas finanças
          </div>
        </div>

        {/* Sub */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, marginTop: 20 }}>
          <div style={{
            fontSize: 24, color: TEXT3, textAlign: 'center',
            fontWeight: 400, maxWidth: 720, lineHeight: 1.6,
          }}>
            Dashboard · Receitas · Despesas · Metas · Relatórios · Recorrências
          </div>
        </div>

        {/* Divider line animated */}
        <div style={{
          marginTop: 52,
          opacity: subOp,
          width: interpolate(frame, [50, 100], [0, 480], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          height: 1,
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
        }} />
      </AbsoluteFill>

      {/* URL watermark */}
      <div style={{
        position: 'absolute', bottom: 48, right: 72,
        fontSize: 20, color: TEXT3, fontWeight: 500,
        opacity: subOp,
        letterSpacing: 0.5,
      }}>
        riqfy.com.br
      </div>
    </AbsoluteFill>
  );
};
