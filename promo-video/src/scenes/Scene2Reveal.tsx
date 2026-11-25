import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { VIDEO_COPY, VideoLang } from '../copy';
import { FONTS, THEME } from '../theme';

export const Scene2Reveal: React.FC<{ videoLang?: VideoLang }> = ({ videoLang = 'en' }) => {
  const copy = VIDEO_COPY[videoLang].scene2;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const badgeSpring = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 16, stiffness: 140 } });
  const domainSpring = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 16, stiffness: 140 } });
  const subSpring = spring({ frame: Math.max(0, frame - 32), fps, config: { damping: 16, stiffness: 130 } });

  const exitProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const containerY = interpolate(exitProgress, [0, 1], [0, -24]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: isVertical ? '0 64px' : '0 120px',
        fontFamily: FONTS.sans,
      }}
    >
      {/* Crisp Architectural Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(36, 50, 74, 0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(36, 50, 74, 0.22) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isVertical ? 26 : 22,
          opacity: containerOpacity,
          transform: `translateY(${containerY}px)`,
        }}
      >
        {/* Brand Logo & Wordmark */}
        <div
          style={{
            display: 'flex',
            flexDirection: isVertical ? 'column' : 'row',
            alignItems: 'center',
            gap: isVertical ? 22 : 24,
          }}
        >
          <div
            style={{
              transform: `scale(${interpolate(badgeSpring, [0, 1], [0.6, 1])})`,
              opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
              boxShadow: '0 24px 60px rgba(37, 99, 235, 0.3)',
              borderRadius: 28,
            }}
          >
            <Img
              src={staticFile('nc-mark.svg')}
              style={{
                width: isVertical ? 112 : 104,
                height: isVertical ? 112 : 104,
                borderRadius: 26,
              }}
            />
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: FONTS.display,
              fontSize: isVertical ? 82 : 96,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: THEME.textPrimary,
              opacity: interpolate(titleSpring, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleSpring, [0, 1], [24, 0])}px)`,
            }}
          >
            New Career
          </h2>
        </div>

        {/* Domain Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: isVertical ? '12px 28px' : '12px 26px',
            borderRadius: 14,
            backgroundColor: THEME.surface100,
            border: `1.5px solid ${THEME.border}`,
            opacity: interpolate(domainSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(domainSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: THEME.emerald,
            }}
          />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: isVertical ? 30 : 28,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: THEME.accentLight,
            }}
          >
            career.andydias.pt
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            margin: 0,
            marginTop: 4,
            fontSize: isVertical ? 34 : 34,
            fontWeight: 500,
            color: THEME.textSecondary,
            maxWidth: isVertical ? 820 : 960,
            lineHeight: 1.35,
            opacity: interpolate(subSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subSpring, [0, 1], [18, 0])}px)`,
          }}
        >
          {copy.subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};
