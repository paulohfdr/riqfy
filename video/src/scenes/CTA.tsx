import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/PlusJakartaSans';
import { ORANGE, ORANGE2, YELLOW, GREEN, BG, TEXT, TEXT2, TEXT3, FONT } from '../constants';

loadFont();

const PLANS = [
  { tier: 'Free',   price: 'R$ 0',    period: '/mês',   desc: 'Para começar',         highlight: false, features: ['1 usuário', 'Até 50 lançamentos/mês', 'Dashboard completo', 'Receitas e despesas'] },
  { tier: 'Pro',    price: 'R$ 29,90', period: '/mês',  desc: 'Mais popular',          highlight: true,  features: ['Até 5 usuários', 'Lançamentos ilimitados', 'Relatórios avançados', 'Backup dos dados'] },
  { tier: 'Family', price: 'R$ 49,90', period: '/mês',  desc: 'Para grupos e famílias',highlight: false, features: ['Usuários ilimitados', 'Tudo do Pro', 'Múltiplos contextos', 'Suporte prioritário'] },
];

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeIn   = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut  = interpolate(frame, [durationInFrames - 45, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });

  const titleY   = interpolate(frame, [0, 35], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  // Glow pulse
  const glowScale = interpolate(frame, [0, 60, 120, 180], [0.9, 1.05, 0.95, 1.05], { extrapolateRight: 'clamp' });

  // Plans
  const plansStart = 40;

  // Final CTA block
  const ctaStart = 200;
  const ctaOp    = interpolate(frame, [ctaStart, ctaStart + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaY     = interpolate(frame, [ctaStart, ctaStart + 30], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

  // Logo outro
  const logoStart = durationInFrames - 90;
  const logoOp    = interpolate(frame, [logoStart, logoStart + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoScale = spring({ frame: Math.max(0, frame - logoStart), fps, config: { damping: 18, stiffness: 120 }, from: 0.6, to: 1 });

  const showLogo  = frame > logoStart - 10;

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fadeOut }}>
      <AbsoluteFill style={{ background: BG }} />

      {/* Radial glow */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 1400, height: 900,
          background: `radial-gradient(ellipse, rgba(255,100,0,0.13) 0%, transparent 65%)`,
          transform: `scale(${glowScale})`,
          filter: 'blur(30px)',
          opacity: fadeIn,
        }} />
      </AbsoluteFill>

      {/* Grid */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%)',
      }} />

      {/* PLANS SECTION (shown first, fades out before logo outro) */}
      {!showLogo && (
        <>
          {/* Header */}
          <div style={{
            position: 'absolute', top: 60, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            opacity: fadeIn, transform: `translateY(${titleY}px)`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: ORANGE }}>
              Planos
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2, color: TEXT, lineHeight: 1.1, textAlign: 'center' }}>
              Preço justo para<br />cada momento da sua vida
            </div>
            <div style={{ fontSize: 20, color: TEXT2, marginTop: 4 }}>
              Comece grátis e escale quando precisar. Sem surpresas.
            </div>
          </div>

          {/* Plan cards */}
          <div style={{
            position: 'absolute', top: 300, left: 100, right: 100,
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24,
          }}>
            {PLANS.map((plan, i) => {
              const st = spring({ frame: Math.max(0, frame - (plansStart + i * 16)), fps, config: { damping: 15, stiffness: 110 } });
              return (
                <div key={plan.tier} style={{
                  borderRadius: 22, padding: '36px 28px', position: 'relative',
                  opacity: st,
                  transform: `translateY(${(1 - st) * 40}px)`,
                  background: plan.highlight ? BG : '#ffffff',
                  border: plan.highlight
                    ? `1px solid rgba(255,100,0,0.4)`
                    : '1px solid #e5e7eb',
                  boxShadow: plan.highlight
                    ? '0 0 0 1px rgba(255,100,0,0.15), 0 30px 70px rgba(255,100,0,0.15)'
                    : 'none',
                }}>
                  {plan.tier === 'Pro' && (
                    <div style={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      background: `linear-gradient(135deg, ${ORANGE}, ${YELLOW})`,
                      color: '#fff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                      padding: '5px 18px', borderRadius: 50, whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(255,100,0,0.4)',
                    }}>
                      Mais popular
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#9ca3af', marginBottom: 16 }}>{plan.tier}</div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: plan.highlight ? TEXT : '#111', marginBottom: 6, lineHeight: 1 }}>
                    {plan.price}<span style={{ fontSize: 15, fontWeight: 500, color: plan.highlight ? TEXT3 : '#9ca3af' }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize: 14, color: plan.highlight ? TEXT2 : '#4b5563', marginBottom: 24, lineHeight: 1.5 }}>{plan.desc}</div>
                  <div style={{ height: 1, background: plan.highlight ? 'rgba(255,255,255,0.08)' : '#e5e7eb', marginBottom: 22 }} />
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.8)' : '#111' }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div style={{
                    marginTop: 28, padding: '14px', borderRadius: 12,
                    textAlign: 'center', fontSize: 15, fontWeight: 700,
                    background: plan.highlight
                      ? `linear-gradient(135deg, ${ORANGE}, ${ORANGE2})`
                      : '#f5f5f3',
                    color: plan.highlight ? '#fff' : '#111',
                    boxShadow: plan.highlight ? '0 8px 24px rgba(255,100,0,0.35)' : 'none',
                  }}>
                    {plan.tier === 'Free' ? 'Começar grátis' : `Assinar ${plan.tier}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* WhatsApp CTA */}
          <div style={{
            position: 'absolute', bottom: 40, left: 0, right: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            opacity: ctaOp, transform: `translateY(${ctaY}px)`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: '#25D366', borderRadius: 16,
              padding: '14px 32px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Fale no WhatsApp: (11) 94228-8038</span>
            </div>
            <div style={{ fontSize: 18, color: TEXT3, fontWeight: 500 }}>
              riqfy.com.br
            </div>
          </div>
        </>
      )}

      {/* LOGO OUTRO */}
      {showLogo && (
        <AbsoluteFill style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
          opacity: logoOp,
        }}>
          <div style={{
            transform: `scale(${logoScale})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          }}>
            <div style={{
              fontSize: 110, fontWeight: 800, letterSpacing: -4, lineHeight: 1,
              background: `linear-gradient(135deg, ${TEXT} 0%, rgba(255,255,255,0.6) 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Riq<span style={{
                background: `linear-gradient(135deg, ${ORANGE} 0%, ${YELLOW} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Fy</span>
            </div>
            <div style={{ fontSize: 26, color: TEXT2, fontWeight: 500, letterSpacing: 0.5 }}>
              Controle Financeiro Inteligente
            </div>
            <div style={{
              width: 300, height: 1,
              background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)`,
              marginTop: 8,
            }} />
            <div style={{ fontSize: 22, color: ORANGE, fontWeight: 600, letterSpacing: 1 }}>
              riqfy.com.br
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
