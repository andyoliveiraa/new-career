import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../theme';

interface AnimatedCursorProps {
  x: number;
  y: number;
  clicking?: boolean;
  clickFrame?: number;
  visible?: boolean;
}

export const AnimatedCursor: React.FC<AnimatedCursorProps> = ({
  x,
  y,
  clicking = false,
  clickFrame,
  visible = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!visible) return null;

  const scale = clicking
    ? 0.85
    : clickFrame !== undefined && frame >= clickFrame && frame < clickFrame + 14
    ? interpolate(
        spring({ frame: frame - clickFrame, fps, config: { damping: 12, stiffness: 260 } }),
        [0, 0.5, 1],
        [1, 0.82, 1]
      )
    : 1;

  const rippleAge = clickFrame !== undefined ? frame - clickFrame : -1;
  const showRipple = rippleAge >= 0 && rippleAge < 24;
  const rippleScale = showRipple ? interpolate(rippleAge, [0, 24], [0.2, 2.2]) : 0;
  const rippleOpacity = showRipple ? interpolate(rippleAge, [0, 24], [0.85, 0]) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-4px, -4px) scale(${scale})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      {showRipple && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: -14,
            width: 36,
            height: 36,
            borderRadius: '9999px',
            border: `2.5px solid ${THEME.accentLight}`,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}
      <svg
        width="30"
        height="34"
        viewBox="0 0 28 32"
        fill="none"
        style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))' }}
      >
        <path
          d="M3 2.5L23.5 14.5L14.2 17.2L18.4 26.8L14.8 28.4L10.6 18.8L3.8 24.4V2.5Z"
          fill="#FFFFFF"
          stroke="#090D16"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
