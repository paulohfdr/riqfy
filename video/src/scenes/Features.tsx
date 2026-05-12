import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { ORANGE, BG, BG2, BG3, TEXT, TEXT2, TEXT3, FONT } from '../constants';

loadFont();

const FEATURES = [
  { icon: '📊', title: 'Dashboard Completo',          desc: 'Saldo, receitas, despesas e gráficos em tempo real num único painel limpo.',       tag: 'Dashboard',  color: 'rgba(255,100,0,0.12)' },
  { icon: '💰', title: 'Controle de Receitas',        desc: 'Registre entradas, categorize e acompanhe o que foi recebido ou está pendente.',   tag: 'Receitas',   color: 'rgba(34,197,94,0.1)'  },
  { icon: '💳', title: 'Gestão de Despesas',          desc: 'Categorias, vencimentos e parcelamentos automáticos. Nada passa despercebido.',    tag: 'Despesas',   color: 'rgba(239,68,68,0.1)'  },
  { icon: '🎯', title: 'Metas Financeiras',           desc: 'Defina objetivos, faça aportes e veja em tempo real quanto falta para cada meta.', tag: 'Metas',      color: 'rgba(253,197,0,0.1)'  },
  { icon: '📈', title: 'Relatórios Detalhados',       desc: 'Análises mensais e anuais por categoria. Entenda onde seu dinheiro está indo.',    tag: 'Relatórios', color: 'rgba(0,41,107,0.12)'  },
  { icon: '🔄', title: 'Recorrências Automáticas',   desc: 'Configure salário e assinaturas uma vez. O sistema lança todo mês sozinho.',       tag: 'Automação',  color: 'rgba(139,92,246,0.1)' },
];

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeIn  = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(frame, [0, 30], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fadeOut }}>
      <AbsoluteFill style={{ background: '#0d0d0d' }} />

      {/* Glow top */}
      <div style={{
        position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
        width: 1400, height: 400,
        background: `radial-gradient(ellipse, rgba(255,100,0,0.08) 0%, transparent 65%)`,
        filter: 'blur(30px)', opacity: fadeIn,
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 70, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        opacity: fadeIn, transform: `translateY(${titleY}px)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
          color: ORANGE,
        }}>
          <div style={{ width: 18, height: 2, background: ORANGE, borderRadius: 2 }} />
          Funcionalidades
        </div>
        <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: -2, color: TEXT, lineHeight: 1.1, textAlign: 'center' }}>
          Tudo que você precisa,<br />num só lugar
        </div>
      </div>

      {/* Feature grid */}
      <div style={{
        position: 'absolute', top: 240, left: 80, right: 80, bottom: 60,
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20,
      }}>
        {FEATURES.map((feat, i) => {
          const row = Math.floor(i / 3);
          const startFrame = 25 + i * 14;
          const cardOp  = interpolate(frame, [startFrame, startFrame + 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const cardY   = interpolate(frame, [startFrame, startFrame + 25], [35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={feat.title} style={{
              background: '#ffffff', borderRadius: 20,
              padding: '32px 28px',
              border: '1px solid #e5e7eb',
              opacity: cardOp,
              transform: `translateY(${cardY}px)`,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: feat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, marginBottom: 20,
              }}>
                {feat.icon}
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#111', marginBottom: 10 }}>{feat.title}</div>
              <div style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, flex: 1 }}>{feat.desc}</div>
              <div style={{
                marginTop: 18, fontSize: 12, fontWeight: 700,
                color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.8,
              }}>
                {feat.tag} →
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
