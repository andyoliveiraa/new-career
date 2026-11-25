import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Code2, ExternalLink, FlaskConical } from 'lucide-react';
import { FONTS, THEME } from '../theme';

export const Scene6OpenSourceBeta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVertical = height > width;

  const pillsSpring = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 16, stiffness: 140 } });
  const repoSpring = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 15, stiffness: 140 } });
  const subSpring = spring({ frame: Math.max(0, frame - 34), fps, config: { damping: 16, stiffness: 130 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: isVertical ? '0 68px' : '0 120px',
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
          maskImage: 'radial-gradient(ellipse 70% 62% at 50% 50%, black 35%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isVertical ? 28 : 26,
          maxWidth: isVertical ? 900 : 1240,
        }}
      >
        {/* Status Pills: Public Beta + Open Source */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
            opacity: interpolate(pillsSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(pillsSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              fontSize: isVertical ? 18 : 16,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Public Beta</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: THEME.emeraldLight,
              fontSize: isVertical ? 18 : 16,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Code2 className="w-4 h-4" />
            <span>Open Source</span>
          </div>
        </div>

        {/* Headline */}
        <h2
          style={{
            margin: 0,
            fontFamily: FONTS.display,
            fontSize: isVertical ? 60 : 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: THEME.textPrimary,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleSpring, [0, 1], [26, 0])}px)`,
          }}
        >
          Open Source &amp; Currently in Beta.
        </h2>

        {/* Subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: isVertical ? 28 : 26,
            color: THEME.textSecondary,
            lineHeight: 1.4,
            maxWidth: isVertical ? 820 : 960,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleSpring, [0, 1], [22, 0])}px)`,
          }}
        >
          Built transparently in the open. Explore the full source code on GitHub:
        </p>

        {/* GitHub Repository Card */}
        <div
          style={{
            marginTop: 6,
            padding: isVertical ? '22px 30px' : '22px 36px',
            borderRadius: 18,
            backgroundColor: THEME.surface100,
            border: `1.5px solid ${THEME.accent}`,
            boxShadow: '0 24px 60px rgba(37, 99, 235, 0.22)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: interpolate(repoSpring, [0, 1], [0, 1]),
            transform: `scale(${interpolate(repoSpring, [0, 1], [0.92, 1])})`,
          }}
        >
          {/* Crisp GitHub Mark */}
          <svg
            width={isVertical ? 32 : 34}
            height={isVertical ? 32 : 34}
            viewBox="0 0 24 24"
            fill={THEME.textPrimary}
            style={{ flexShrink: 0 }}
          >
            <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.64 3.01 8.58 7.18 9.97.52.1.72-.23.72-.5 0-.25-.01-1.08-.01-1.96-2.92.63-3.54-1.24-3.54-1.24-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.06.07 1.61 1.09 1.61 1.09.94 1.61 2.46 1.14 3.06.87.09-.68.37-1.14.67-1.4-2.33-.26-4.78-1.17-4.78-5.19 0-1.15.41-2.09 1.08-2.82-.11-.27-.47-1.33.1-2.78 0 0 .88-.28 2.89 1.08a10.05 10.05 0 0 1 5.26 0c2.01-1.36 2.89-1.08 2.89-1.08.57 1.45.21 2.51.1 2.78.67.73 1.08 1.67 1.08 2.82 0 4.03-2.45 4.92-4.79 5.18.38.32.72.97.72 1.96 0 1.42-.01 2.56-.01 2.91 0 .28.19.61.73.5A10.51 10.51 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5Z" />
          </svg>

          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: isVertical ? 26 : 30,
              fontWeight: 700,
              color: THEME.accentLight,
              letterSpacing: '-0.01em',
              wordBreak: 'break-all',
            }}
          >
            https://github.com/andyoliveiraa/new-career
          </span>

          {!isVertical && <ExternalLink className="w-6 h-6 text-slate-400 shrink-0" />}
        </div>

        {/* Footer note */}
        <div
          style={{
            marginTop: 8,
            fontSize: isVertical ? 20 : 18,
            color: THEME.textMuted,
            opacity: interpolate(subSpring, [0, 1], [0, 1]),
          }}
        >
          Based on <span style={{ color: THEME.textSecondary, fontWeight: 600 }}>career-ops</span> concepts • Live at{' '}
          <span style={{ color: THEME.textSecondary, fontWeight: 600 }}>career.andydias.pt</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
