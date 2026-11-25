import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VIDEO_COPY, VideoLang } from '../copy';
import { FONTS, THEME } from '../theme';

export const Scene1Hook: React.FC<{ videoLang?: VideoLang }> = ({ videoLang = 'en' }) => {
  const copy = VIDEO_COPY[videoLang].scene1;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const line1Spring = spring({ frame, fps, config: { damping: 16, stiffness: 150 } });
  const line2Spring = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 16, stiffness: 150 } });
  const line3Spring = spring({ frame: Math.max(0, frame - 34), fps, config: { damping: 15, stiffness: 140 } });
  const underlineWidth = interpolate(
    spring({ frame: Math.max(0, frame - 26), fps, config: { damping: 18, stiffness: 120 } }),
    [0, 1],
    [0, 100]
  );

  // Subtle exit transition in last 18 frames
  const exitProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const containerScale = interpolate(exitProgress, [0, 1], [1, 0.96]);

  const titleSize = isVertical ? 64 : 84;
  const subSize = isVertical ? 40 : 54;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        justifyContent: 'center',
        alignItems: 'center',
        padding: isVertical ? '0 72px' : '0 140px',
        fontFamily: FONTS.display,
      }}
    >
      {/* Clean Architectural Grid Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(36, 50, 74, 0.28) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(36, 50, 74, 0.28) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 50%, black 35%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isVertical ? 28 : 22,
          opacity: containerOpacity,
          transform: `scale(${containerScale})`,
          maxWidth: isVertical ? 940 : 1480,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 18px',
            borderRadius: 999,
            backgroundColor: THEME.surface100,
            border: `1px solid ${THEME.border}`,
            fontFamily: FONTS.sans,
            fontSize: isVertical ? 20 : 18,
            fontWeight: 600,
            color: THEME.textSecondary,
            opacity: interpolate(line1Spring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(line1Spring, [0, 1], [16, 0])}px)`,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: THEME.accentLight }} />
          <span>{copy.pill}</span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: THEME.textPrimary,
          }}
        >
          <span
            style={{
              display: 'block',
              opacity: interpolate(line1Spring, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(line1Spring, [0, 1], [36, 0])}px)`,
            }}
          >
            {copy.line1}
          </span>
          <span
            style={{
              display: 'inline-block',
              position: 'relative',
              opacity: interpolate(line2Spring, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(line2Spring, [0, 1], [36, 0])}px)`,
            }}
          >
            {copy.line2}
            <span
              style={{
                position: 'absolute',
                left: 0,
                bottom: -6,
                height: 5,
                width: `${underlineWidth}%`,
                backgroundColor: THEME.accent,
                borderRadius: 4,
              }}
            />
          </span>
        </h1>

        <p
          style={{
            margin: 0,
            marginTop: isVertical ? 14 : 10,
            fontSize: subSize,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: THEME.accentLight,
            opacity: interpolate(line3Spring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(line3Spring, [0, 1], [30, 0])}px)`,
          }}
        >
          {copy.sub}
        </p>
      </div>
    </AbsoluteFill>
  );
};
