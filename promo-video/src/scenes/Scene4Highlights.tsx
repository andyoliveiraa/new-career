import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Bell, Columns, FileText, Globe, Radar } from 'lucide-react';
import { VIDEO_COPY, VideoLang } from '../copy';
import { FONTS, THEME } from '../theme';

const HIGHLIGHT_STYLE = [
  { icon: Radar, color: '#3b82f6' },
  { icon: Columns, color: '#10b981' },
  { icon: Bell, color: '#818cf8' },
  { icon: FileText, color: '#f59e0b' },
  { icon: Globe, color: '#38bdf8' },
];

export const Scene4Highlights: React.FC<{ videoLang?: VideoLang }> = ({ videoLang = 'en' }) => {
  const copy = VIDEO_COPY[videoLang].scene4;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  const headSpring = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const exitProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const containerOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const containerScale = interpolate(exitProgress, [0, 1], [1, 0.96]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: isVertical ? '0 72px' : '0 100px',
        fontFamily: FONTS.sans,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(to right, rgba(36, 50, 74, 0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(36, 50, 74, 0.22) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 50%, black 30%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isVertical ? 44 : 48,
          opacity: containerOpacity,
          transform: `scale(${containerScale})`,
          width: '100%',
          maxWidth: isVertical ? 880 : 1560,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            opacity: interpolate(headSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headSpring, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: THEME.accentLight, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            {copy.eyebrow}
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: FONTS.display,
              fontSize: isVertical ? 54 : 62,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: THEME.textPrimary,
            }}
          >
            {copy.title}
          </h2>
        </div>

        {/* 5 Staggered Minimalist Badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: isVertical ? 20 : 20,
            width: '100%',
          }}
        >
          {copy.highlights.map((label, idx) => {
            const item = HIGHLIGHT_STYLE[idx];
            const Icon = item.icon;
            const badgeSpring = spring({
              frame: Math.max(0, frame - (16 + idx * 10)),
              fps,
              config: { damping: 14, stiffness: 160 },
            });

            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: isVertical ? '20px 30px' : '20px 28px',
                  borderRadius: 16,
                  backgroundColor: THEME.surface100,
                  border: `1.5px solid ${THEME.border}`,
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
                  opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(badgeSpring, [0, 1], [32, 0])}px) scale(${interpolate(badgeSpring, [0, 1], [0.9, 1])})`,
                  minWidth: isVertical ? 420 : 'auto',
                  justifyContent: isVertical ? 'flex-start' : 'center',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: THEME.surface200,
                    border: `1px solid ${THEME.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: isVertical ? 28 : 24,
                    fontWeight: 700,
                    color: THEME.textPrimary,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
