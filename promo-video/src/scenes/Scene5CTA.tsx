import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArrowRight, GitBranch } from 'lucide-react';
import { FONTS, THEME } from '../theme';

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const logoSpring = spring({ frame, fps, config: { damping: 15, stiffness: 140 } });
  const textSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 16, stiffness: 135 } });
  const domainSpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 16, stiffness: 130 } });
  const btnSpring = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 14, stiffness: 150 } });
  const footerSpring = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 16, stiffness: 130 } });

  const exitProgress = interpolate(frame, [durationInFrames - 16, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const containerY = interpolate(exitProgress, [0, 1], [0, -24]);

  const pulse = frame > 45 ? 1 + Math.sin((frame - 45) * 0.14) * 0.032 : 1;
  const ringOpacity = frame > 45 ? 0.35 + Math.sin((frame - 45) * 0.14) * 0.2 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: isVertical ? '0 72px' : '0 120px',
        fontFamily: FONTS.sans,
      }}
    >
      {/* Crisp Architectural Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(36, 50, 74, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(36, 50, 74, 0.25) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 68% 60% at 50% 50%, black 35%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isVertical ? 28 : 24,
          maxWidth: isVertical ? 880 : 1200,
          opacity: containerOpacity,
          transform: `translateY(${containerY}px)`,
        }}
      >
        {/* Brand Badge + Beta Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: interpolate(logoSpring, [0, 1], [0, 1]),
            transform: `scale(${interpolate(logoSpring, [0, 1], [0.85, 1])})`,
          }}
        >
          <Img src={staticFile('nc-mark.svg')} style={{ width: 52, height: 52, borderRadius: 14 }} />
          <span style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: 700, color: THEME.textPrimary, letterSpacing: '-0.02em' }}>
            New Career
          </span>
          <span
            style={{
              fontFamily: FONTS.sans,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
            }}
          >
            Beta
          </span>
        </div>

        {/* Main CTA Headline */}
        <h2
          style={{
            margin: 0,
            fontFamily: FONTS.display,
            fontSize: isVertical ? 68 : 82,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: THEME.textPrimary,
            opacity: interpolate(textSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(textSpring, [0, 1], [28, 0])}px)`,
          }}
        >
          Upgrade your job search today.
        </h2>

        {/* Highlighted Domain */}
        <div
          style={{
            padding: '12px 30px',
            borderRadius: 14,
            backgroundColor: THEME.surface100,
            border: `1.5px solid ${THEME.border}`,
            opacity: interpolate(domainSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(domainSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: isVertical ? 34 : 32,
              fontWeight: 700,
              color: THEME.accentLight,
              letterSpacing: '-0.01em',
            }}
          >
            career.andydias.pt
          </span>
        </div>

        {/* Gently Pulsing Get Started Button */}
        <div
          style={{
            marginTop: 6,
            position: 'relative',
            opacity: interpolate(btnSpring, [0, 1], [0, 1]),
            transform: `scale(${interpolate(btnSpring, [0, 1], [0.88, 1]) * pulse})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 20,
              border: `2px solid ${THEME.accentLight}`,
              opacity: ringOpacity,
            }}
          />
          <div
            style={{
              padding: isVertical ? '22px 48px' : '20px 44px',
              borderRadius: 16,
              backgroundColor: THEME.accent,
              color: '#ffffff',
              fontFamily: FONTS.display,
              fontSize: isVertical ? 30 : 26,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 18px 42px rgba(37, 99, 235, 0.45)',
            }}
          >
            <span>Get Started</span>
            <ArrowRight className="w-7 h-7" />
          </div>
        </div>

        {/* Clarification: Based on career-ops (independently built) */}
        <div
          style={{
            marginTop: isVertical ? 16 : 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: isVertical ? '12px 22px' : '10px 20px',
            borderRadius: 12,
            backgroundColor: THEME.surface100,
            border: `1px solid ${THEME.border}`,
            opacity: interpolate(footerSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerSpring, [0, 1], [16, 0])}px)`,
            fontSize: isVertical ? 19 : 16,
            color: THEME.textSecondary,
          }}
        >
          <GitBranch className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Inspired by &amp; based on <strong style={{ color: THEME.textPrimary }}>career-ops</strong> on GitHub — independently built for the web
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
