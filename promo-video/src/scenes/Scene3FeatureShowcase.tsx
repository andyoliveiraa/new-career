import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Bell, CheckCircle2, Columns, FileText, Globe, Play,
  Radar, Search, Sparkles, TrendingUp
} from 'lucide-react';
import { BrowserFrame, LangCode, NavTabId } from '../components/BrowserFrame';
import { AnimatedCursor } from '../components/AnimatedCursor';
import { VIDEO_COPY, VideoCopy, VideoLang } from '../copy';
import { FONTS, THEME } from '../theme';

const LOCALIZED_DASHBOARD: Record<LangCode, {
  title: string;
  subtitle: string;
  cta: string;
  kpis: [string, string, string];
  langBanner: string;
}> = {
  EN: {
    title: 'Career Operations Center',
    subtitle: 'Real-time job monitoring & ATS resume tailoring.',
    cta: 'New Scan',
    kpis: ['Total Jobs', 'Applied', 'Interviewing'],
    langBanner: 'Active Workspace Language: English (EN)',
  },
  PT: {
    title: 'Central de Operações de Carreira',
    subtitle: 'Monitorização de vagas em tempo real e adaptação de CVs.',
    cta: 'Nova Varredura',
    kpis: ['Total de Vagas', 'Candidatado', 'Em Entrevista'],
    langBanner: 'Idioma Ativo da Interface: Português (PT)',
  },
  ES: {
    title: 'Centro de Operaciones de Carrera',
    subtitle: 'Monitoreo de empleos en tiempo real y adaptación ATS.',
    cta: 'Nuevo Escaneo',
    kpis: ['Empleos Totales', 'Postulado', 'Entrevista'],
    langBanner: 'Idioma Activo del Espacio: Español (ES)',
  },
};

export const Scene3FeatureShowcase: React.FC<{ videoLang?: VideoLang }> = ({ videoLang = 'en' }) => {
  const copy = VIDEO_COPY[videoLang].scene3;
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isVertical = height > width;

  // 5 features x 170 frames = 850 frames (~14.2s at 60fps)
  const SEGMENT = 170;
  const featureIdx = Math.min(4, Math.floor(frame / SEGMENT));
  const localFrame = frame - featureIdx * SEGMENT;

  const entrySpring = spring({ frame, fps, config: { damping: 16, stiffness: 120 } });
  const exitProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic 3D perspective + subtle Pan & Zoom per feature
  const baseTiltY = isVertical ? 0 : interpolate(featureIdx, [0, 1, 2, 3, 4], [-3.5, 2.5, -2.5, 3, 0]);
  const baseTiltX = isVertical ? 2 : 3.5;

  let zoomScale = 1;
  let panX = 0;
  let panY = 0;

  if (featureIdx === 0) {
    const z = spring({ frame: Math.max(0, localFrame - 20), fps, config: { damping: 20, stiffness: 90 } });
    zoomScale = interpolate(z, [0, 1], [1, isVertical ? 1.04 : 1.07]);
    panY = interpolate(z, [0, 1], [0, isVertical ? -12 : -18]);
  } else if (featureIdx === 1) {
    const z = spring({ frame: Math.max(0, localFrame - 15), fps, config: { damping: 20, stiffness: 90 } });
    zoomScale = interpolate(z, [0, 1], [1.02, isVertical ? 1.04 : 1.06]);
    panX = interpolate(localFrame, [0, SEGMENT], [14, -14]);
  } else if (featureIdx === 2) {
    const z = spring({ frame: Math.max(0, localFrame - 30), fps, config: { damping: 18, stiffness: 100 } });
    zoomScale = interpolate(z, [0, 1], [1, isVertical ? 1.03 : 1.06]);
    panX = interpolate(z, [0, 1], [0, isVertical ? 0 : -24]);
  } else if (featureIdx === 3) {
    const z = spring({ frame: Math.max(0, localFrame - 18), fps, config: { damping: 18, stiffness: 100 } });
    zoomScale = interpolate(z, [0, 1], [1.01, isVertical ? 1.04 : 1.07]);
    panX = interpolate(z, [0, 1], [0, isVertical ? 0 : -16]);
  } else if (featureIdx === 4) {
    const z = spring({ frame: Math.max(0, localFrame - 12), fps, config: { damping: 18, stiffness: 95 } });
    zoomScale = interpolate(z, [0, 1], [1.02, isVertical ? 1.08 : 1.14]);
    panX = interpolate(z, [0, 1], [0, isVertical ? -55 : -130]);
    panY = interpolate(z, [0, 1], [0, isVertical ? 75 : 88]);
  }

  const mockupOpacity = interpolate(entrySpring, [0, 1], [0, 1]) * interpolate(exitProgress, [0, 1], [1, 0]);
  const mockupY = interpolate(entrySpring, [0, 1], [48, 0]) + interpolate(exitProgress, [0, 1], [0, -28]);

  // Active tab & language state
  const tabMap: NavTabId[] = ['scrapers', 'jobs', 'settings', 'cv-builder', 'dashboard'];
  const activeTab = tabMap[featureIdx];

  let currentLang: LangCode = videoLang === 'pt' ? 'PT' : 'EN';
  if (featureIdx === 4) {
    if (videoLang === 'pt') {
      if (localFrame >= 38 && localFrame < 84) currentLang = 'EN';
      else if (localFrame >= 84 && localFrame < 128) currentLang = 'ES';
      else currentLang = 'PT';
    } else {
      if (localFrame >= 38 && localFrame < 84) currentLang = 'PT';
      else if (localFrame >= 84 && localFrame < 128) currentLang = 'ES';
      else currentLang = 'EN';
    }
  }

  // Animated Cursor Coordinates (relative to browser inner viewport)
  const containerW = isVertical ? 960 : 1460;
  const containerH = isVertical ? 1060 : 740;

  let cursorX = containerW * 0.5;
  let cursorY = containerH * 0.5;
  let clickFrame: number | undefined;
  let isDragging = false;

  if (featureIdx === 0) {
    const move = spring({ frame: Math.max(0, localFrame - 10), fps, config: { damping: 18, stiffness: 120 } });
    const targetX = isVertical ? containerW * 0.72 : containerW * 0.81;
    const targetY = isVertical ? 320 : 272;
    cursorX = interpolate(move, [0, 1], [containerW * 0.35, targetX]);
    cursorY = interpolate(move, [0, 1], [containerH * 0.65, targetY]);
    clickFrame = 42;
  } else if (featureIdx === 1) {
    // Drag card from column 1 (Found) -> column 2 (Applied) -> column 3 (Interview)
    const grab = spring({ frame: Math.max(0, localFrame - 12), fps, config: { damping: 18, stiffness: 130 } });
    const drag = spring({ frame: Math.max(0, localFrame - 42), fps, config: { damping: 16, stiffness: 90 } });
    const col1X = isVertical ? 170 : 230;
    const col3X = isVertical ? containerW - 180 : containerW - 250;
    const cardY = isVertical ? 360 : 320;
    cursorX = localFrame < 42
      ? interpolate(grab, [0, 1], [containerW * 0.5, col1X])
      : interpolate(drag, [0, 1], [col1X, col3X]);
    cursorY = localFrame < 42
      ? interpolate(grab, [0, 1], [cardY + 120, cardY])
      : cardY + Math.sin(drag * Math.PI) * -28;
    clickFrame = 40;
    isDragging = localFrame >= 42 && localFrame <= 125;
  } else if (featureIdx === 2) {
    const move = spring({ frame: Math.max(0, localFrame - 8), fps, config: { damping: 18, stiffness: 120 } });
    const btnX = isVertical ? containerW * 0.74 : containerW * 0.44;
    const btnY = isVertical ? 330 : 310;
    cursorX = interpolate(move, [0, 1], [containerW * 0.25, btnX]);
    cursorY = interpolate(move, [0, 1], [containerH * 0.55, btnY]);
    clickFrame = 36;
  } else if (featureIdx === 3) {
    const move1 = spring({ frame: Math.max(0, localFrame - 15), fps, config: { damping: 16, stiffness: 130 } });
    const move2 = spring({ frame: Math.max(0, localFrame - 85), fps, config: { damping: 16, stiffness: 130 } });
    const x1 = isVertical ? 280 : 270;
    const y1 = isVertical ? 310 : 340;
    const x2 = isVertical ? 280 : 270;
    const y2 = isVertical ? 405 : 430;
    if (localFrame < 80) {
      cursorX = interpolate(move1, [0, 1], [containerW * 0.6, x1]);
      cursorY = interpolate(move1, [0, 1], [containerH * 0.6, y1]);
      clickFrame = 46;
    } else {
      cursorX = interpolate(move2, [0, 1], [x1, x2]);
      cursorY = interpolate(move2, [0, 1], [y1, y2]);
      clickFrame = 112;
    }
  } else if (featureIdx === 4) {
    const m1 = spring({ frame: Math.max(0, localFrame - 10), fps, config: { damping: 16, stiffness: 140 } });
    const m2 = spring({ frame: Math.max(0, localFrame - 58), fps, config: { damping: 16, stiffness: 140 } });
    const m3 = spring({ frame: Math.max(0, localFrame - 104), fps, config: { damping: 16, stiffness: 140 } });
    const ptX = isVertical ? containerW - 102 : containerW - 134;
    const esX = isVertical ? containerW - 64 : containerW - 96;
    const enX = isVertical ? containerW - 140 : containerW - 172;
    const topY = 72;
    const firstX = videoLang === 'pt' ? enX : ptX;
    const thirdX = videoLang === 'pt' ? ptX : enX;
    if (localFrame < 56) {
      cursorX = interpolate(m1, [0, 1], [containerW * 0.5, firstX]);
      cursorY = interpolate(m1, [0, 1], [containerH * 0.45, topY]);
      clickFrame = 36;
    } else if (localFrame < 102) {
      cursorX = interpolate(m2, [0, 1], [firstX, esX]);
      cursorY = topY;
      clickFrame = 82;
    } else {
      cursorX = interpolate(m3, [0, 1], [esX, thirdX]);
      cursorY = topY;
      clickFrame = 126;
    }
  }

  const meta = copy.features[featureIdx];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: isVertical ? '72px 48px' : '42px 80px',
        fontFamily: FONTS.sans,
      }}
    >
      {/* Top Feature Caption Bar */}
      <div
        style={{
          position: 'absolute',
          top: isVertical ? 84 : 36,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 40,
          opacity: mockupOpacity,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            borderRadius: 999,
            backgroundColor: THEME.surface100,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: 14,
              fontWeight: 700,
              color: THEME.accentLight,
            }}
          >
            {meta.step} / 05
          </span>
          <span style={{ width: 1, height: 14, backgroundColor: THEME.border }} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: isVertical ? 22 : 20,
              fontWeight: 700,
              color: THEME.textPrimary,
            }}
          >
            {meta.label}
          </span>
        </div>
        <span style={{ fontSize: isVertical ? 20 : 16, color: THEME.textSecondary }}>
          {meta.sub}
        </span>
      </div>

      {/* 3D Browser Mockup Wrapper */}
      <div
        style={{
          width: containerW,
          height: containerH,
          marginTop: isVertical ? 120 : 68,
          opacity: mockupOpacity,
          transform: `
            perspective(1800px)
            translateY(${mockupY}px)
            translateX(${panX}px)
            translateY(${panY}px)
            scale(${zoomScale})
            rotateX(${baseTiltX}deg)
            rotateY(${baseTiltY}deg)
          `,
          position: 'relative',
        }}
      >
        <BrowserFrame
          activeTab={activeTab}
          lang={currentLang}
          isVertical={isVertical}
          highlightLang={featureIdx === 4}
          jobsCount={featureIdx === 0 && localFrame > 110 ? 42 : 24}
        >
          {featureIdx === 0 && <Feature1Scraping localFrame={localFrame} isVertical={isVertical} copy={copy.scraping} />}
          {featureIdx === 1 && <Feature2Pipeline localFrame={localFrame} isVertical={isVertical} copy={copy.pipeline} />}
          {featureIdx === 2 && <Feature3Discord localFrame={localFrame} isVertical={isVertical} copy={copy.discord} />}
          {featureIdx === 3 && <Feature4CVTemplates localFrame={localFrame} isVertical={isVertical} copy={copy.cv} />}
          {featureIdx === 4 && <Feature5Language lang={currentLang} isVertical={isVertical} instantBadge={copy.langSwitch.instantBadge} />}
        </BrowserFrame>

        <AnimatedCursor x={cursorX} y={cursorY} clicking={isDragging} clickFrame={clickFrame} />
      </div>

      {/* Bottom Progress Indicator Pills */}
      <div
        style={{
          position: 'absolute',
          bottom: isVertical ? 76 : 28,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          opacity: mockupOpacity,
        }}
      >
        {copy.features.map((f, idx) => {
          const isCurrent = idx === featureIdx;
          const pct = isCurrent ? Math.min(1, localFrame / SEGMENT) : idx < featureIdx ? 1 : 0;
          return (
            <div
              key={f.step}
              style={{
                width: isCurrent ? (isVertical ? 84 : 110) : (isVertical ? 32 : 42),
                height: 6,
                borderRadius: 999,
                backgroundColor: THEME.surface300,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct * 100}%`,
                  height: '100%',
                  backgroundColor: isCurrent ? THEME.accentLight : THEME.emerald,
                  borderRadius: 999,
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- FEATURE 1: AUTOMATED JOB SCRAPING ---------------- */
const Feature1Scraping: React.FC<{ localFrame: number; isVertical: boolean; copy: VideoCopy['scene3']['scraping'] }> = ({
  localFrame,
  isVertical,
  copy,
}) => {
  const { fps } = useVideoConfig();
  const scanStarted = localFrame >= 42;
  const scanProgress = scanStarted
    ? interpolate(localFrame, [45, 140], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const radarAngle = scanStarted ? (localFrame - 42) * 8 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: THEME.textPrimary, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search className="w-5 h-5 text-blue-400" />
            {copy.title}
          </div>
          <div style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 2 }}>
            {copy.subtitle}
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isVertical ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
        {copy.sources.map((s) => (
          <div
            key={s.name}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: THEME.accentMuted,
              border: `1px solid ${THEME.accent}`,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>{s.name}</div>
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 4 }}>{s.tag}</div>
          </div>
        ))}
      </div>

      {/* Query Bar + Scan Jobs Button */}
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          backgroundColor: THEME.surface100,
          border: `1px solid ${THEME.border}`,
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: isVertical ? 'stretch' : 'center',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, backgroundColor: THEME.surface200, border: `1px solid ${THEME.border}`, fontSize: 14, color: THEME.textPrimary }}>
          {copy.roleLabel} <strong>{copy.roleValue}</strong>
        </div>
        <div style={{ flex: 0.7, padding: '10px 14px', borderRadius: 10, backgroundColor: THEME.surface200, border: `1px solid ${THEME.border}`, fontSize: 14, color: THEME.textPrimary }}>
          {copy.locLabel} <strong>{copy.locValue}</strong>
        </div>
        <div
          style={{
            padding: '11px 24px',
            borderRadius: 10,
            backgroundColor: scanStarted && scanProgress < 100 ? '#1d4ed8' : THEME.accent,
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transform: localFrame >= 40 && localFrame < 50 ? 'scale(0.95)' : 'scale(1)',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
          }}
        >
          <Play className="w-4 h-4" />
          <span>{scanStarted && scanProgress < 100 ? copy.scanningBtn : copy.scanBtn}</span>
        </div>
      </div>

      {/* Radar Progress Bar & Live Results */}
      <div
        style={{
          flex: 1,
          padding: 18,
          borderRadius: 14,
          backgroundColor: THEME.surface100,
          border: `1px solid ${THEME.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>
            <div style={{ transform: `rotate(${radarAngle}deg)`, display: 'flex' }}>
              <Radar className="w-5 h-5 text-blue-400" />
            </div>
            <span>
              {!scanStarted
                ? copy.readyStatus
                : scanProgress < 100
                ? `${copy.scanningStatus} ${Math.round(scanProgress)}%`
                : copy.completeStatus}
            </span>
          </div>
          {scanProgress >= 100 && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.14)', color: THEME.emeraldLight }}>
              {copy.newMatchesBadge}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ height: 8, width: '100%', backgroundColor: THEME.surface200, borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${scanProgress}%`,
              backgroundColor: scanProgress >= 100 ? THEME.emerald : THEME.accentLight,
              borderRadius: 999,
            }}
          />
        </div>

        {/* Discovered Job Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {copy.discovered.map((job) => {
            const s = spring({ frame: Math.max(0, localFrame - job.appearAt), fps, config: { damping: 14, stiffness: 150 } });
            if (localFrame < job.appearAt) return null;
            return (
              <div
                key={job.title}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: THEME.surface200,
                  border: `1px solid ${THEME.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: interpolate(s, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textPrimary }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 2 }}>
                    {job.company} • {job.loc} • <span style={{ color: THEME.emeraldLight }}>{job.salary}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.12)', color: THEME.emeraldLight }}>
                  {copy.activeBadge}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- FEATURE 2: JOBS & PIPELINE KANBAN ---------------- */
const Feature2Pipeline: React.FC<{ localFrame: number; isVertical: boolean; copy: VideoCopy['scene3']['pipeline'] }> = ({
  localFrame,
  isVertical,
  copy,
}) => {
  const { fps } = useVideoConfig();
  const drag = spring({ frame: Math.max(0, localFrame - 42), fps, config: { damping: 16, stiffness: 90 } });
  const dropped = localFrame >= 125;

  const col1Count = localFrame < 42 ? 4 : 3;
  const col2Count = localFrame >= 75 && localFrame < 110 ? 4 : 3;
  const col3Count = dropped ? 3 : 2;

  const colW = isVertical ? 285 : 430;
  const dragStartX = 0;
  const dragEndX = isVertical ? 616 : 922;
  const dragX = interpolate(drag, [0, 1], [dragStartX, dragEndX]);
  const dragY = Math.sin(drag * Math.PI) * -22;
  const spacerHeight = interpolate(drag, [0.55, 1], [0, 96], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: THEME.textPrimary, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Columns className="w-5 h-5 text-blue-400" />
            {copy.title}
          </div>
          <div style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 2 }}>
            {copy.subtitle}
          </div>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 8, backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}`, fontSize: 12, color: THEME.textPrimary, fontWeight: 600 }}>
          {copy.viewPill}
        </div>
      </div>

      {/* 3-Column Pipeline Showcase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flex: 1, position: 'relative' }}>
        {/* Column 1: Found */}
        <div style={{ backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.border}`, paddingBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.amber, textTransform: 'uppercase' }}>{copy.cols.found}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: THEME.surface200, color: THEME.textPrimary }}>{col1Count}</span>
          </div>

          {/* Dragged Card */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: THEME.surface200,
              border: `1.5px solid ${localFrame >= 40 && !dropped ? THEME.accentLight : THEME.border}`,
              boxShadow: localFrame >= 40 && !dropped ? '0 24px 48px rgba(0,0,0,0.65)' : 'none',
              transform: localFrame >= 40
                ? `translate(${dragX}px, ${dragY}px) rotate(${dropped ? 0 : 2}deg) scale(${dropped ? 1 : 1.03})`
                : 'none',
              zIndex: 35,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: THEME.accentMuted, color: THEME.accentLight }}>
                {copy.matchTag}
              </span>
              <span style={{ fontSize: 11, color: THEME.emeraldLight, fontWeight: 600 }}>{copy.activeBadge}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>Senior Full Stack Engineer</div>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginTop: 4 }}>Acme Cloud • {copy.remoteWord}</div>
          </div>

          <PipelineStaticCard title="Backend Engineer (FastAPI)" company="GitLab" tag={copy.staticCards.found1Tag} />
          <PipelineStaticCard title="Platform Engineer" company="Stripe" tag={copy.staticCards.found2Tag} />
        </div>

        {/* Column 2: Applied */}
        <div style={{ backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.border}`, paddingBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.emeraldLight, textTransform: 'uppercase' }}>{copy.cols.applied}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: THEME.surface200, color: THEME.textPrimary }}>{col2Count}</span>
          </div>
          <PipelineStaticCard title="Product Engineer" company="Linear" tag={copy.staticCards.applied1Tag} />
          <PipelineStaticCard title="Cloud Developer" company="Vercel" tag={copy.staticCards.applied2Tag} />
        </div>

        {/* Column 3: Interview */}
        <div style={{ backgroundColor: THEME.surface100, border: `1.5px solid ${dropped ? THEME.emerald : THEME.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.border}`, paddingBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.accentLight, textTransform: 'uppercase' }}>{copy.cols.interview}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, backgroundColor: THEME.surface200, color: THEME.textPrimary }}>{col3Count}</span>
          </div>
          {spacerHeight > 1 && <div style={{ height: spacerHeight }} />}
          <PipelineStaticCard title="Senior TypeScript Dev" company="Supabase" tag={copy.staticCards.interview1Tag} />
          <PipelineStaticCard title="AI Systems Engineer" company="Anthropic" tag={copy.staticCards.interview2Tag} />
        </div>
      </div>

      {/* Unused width helper kept clean */}
      <div style={{ display: 'none', width: colW }} />
    </div>
  );
};

const PipelineStaticCard: React.FC<{ title: string; company: string; tag: string }> = ({ title, company, tag }) => (
  <div style={{ padding: 14, borderRadius: 10, backgroundColor: THEME.surface200, border: `1px solid ${THEME.border}` }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>{title}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
      <span style={{ fontSize: 12, color: THEME.textSecondary }}>{company}</span>
      <span style={{ fontSize: 11, color: THEME.textMuted }}>{tag}</span>
    </div>
  </div>
);

/* ---------------- FEATURE 3: DISCORD WEBHOOK ALERTS ---------------- */
const Feature3Discord: React.FC<{ localFrame: number; isVertical: boolean; copy: VideoCopy['scene3']['discord'] }> = ({
  localFrame,
  isVertical,
  copy,
}) => {
  const { fps } = useVideoConfig();
  const sent = localFrame >= 36;
  const popupSpring = spring({ frame: Math.max(0, localFrame - 46), fps, config: { damping: 14, stiffness: 145 } });
  const pulseProgress = interpolate(localFrame, [36, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isVertical ? '1fr' : '1fr 1.15fr',
        gap: 24,
        height: '100%',
        alignItems: 'center',
      }}
    >
      {/* Left: Platform Webhook Settings */}
      <div style={{ padding: 22, borderRadius: 16, backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(88, 101, 242, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: THEME.textPrimary }}>{copy.title}</div>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>{copy.subtitle}</div>
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: THEME.surface200, border: `1px solid ${THEME.border}`, fontSize: 12, fontFamily: 'monospace', color: THEME.textSecondary }}>
          https://discord.com/api/webhooks/••••9842
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: THEME.emeraldLight, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 className="w-4 h-4" />
            {sent ? copy.sentStatus : copy.connectedStatus}
          </span>
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              backgroundColor: THEME.accent,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              transform: localFrame >= 34 && localFrame < 44 ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            {copy.sendTestBtn}
          </div>
        </div>

        {sent && (
          <div style={{ height: 4, width: '100%', backgroundColor: THEME.surface200, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pulseProgress * 100}%`, height: '100%', backgroundColor: THEME.discord }} />
          </div>
        )}
      </div>

      {/* Right: Discord Embed Notification Pop-up */}
      <div
        style={{
          padding: 22,
          borderRadius: 16,
          backgroundColor: '#1e1f22',
          border: '1px solid #35373c',
          boxShadow: '0 28px 60px rgba(0, 0, 0, 0.55)',
          opacity: interpolate(popupSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(popupSpring, [0, 1], [32, 0])}px) scale(${interpolate(popupSpring, [0, 1], [0.94, 1])})`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: THEME.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff' }}>
            NC
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>New Career Radar</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, backgroundColor: THEME.discord, color: '#fff' }}>
              APP
            </span>
            <span style={{ fontSize: 11, color: '#949ba4' }}>{copy.justNow}</span>
          </div>
        </div>

        {/* Discord Embed */}
        <div
          style={{
            backgroundColor: '#2b2d31',
            borderLeft: `4px solid ${THEME.emerald}`,
            borderRadius: '4px 10px 10px 4px',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
            {copy.embedTitle}
          </div>
          <div style={{ fontSize: 13, color: '#dbdee1', lineHeight: 1.45 }}>
            <strong>Senior Full Stack Engineer</strong> — Acme Cloud
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 4 }}>
            <div>
              <div style={{ fontSize: 11, color: '#949ba4', fontWeight: 700 }}>{copy.atsMatchLabel}</div>
              <div style={{ fontSize: 14, color: THEME.emeraldLight, fontWeight: 700 }}>94%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#949ba4', fontWeight: 700 }}>{copy.locationLabel}</div>
              <div style={{ fontSize: 14, color: '#ffffff', fontWeight: 600 }}>{copy.locationVal}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#949ba4', fontWeight: 700 }}>{copy.livenessLabel}</div>
              <div style={{ fontSize: 14, color: THEME.emeraldLight, fontWeight: 600 }}>{copy.livenessVal}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- FEATURE 4: CV TEMPLATES & ATS AUDITOR ---------------- */
const Feature4CVTemplates: React.FC<{ localFrame: number; isVertical: boolean; copy: VideoCopy['scene3']['cv'] }> = ({
  localFrame,
  isVertical,
  copy,
}) => {
  const activeTemplate = localFrame < 48 ? 0 : localFrame < 114 ? 1 : 2;
  const current = copy.templates[activeTemplate];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isVertical ? '1fr' : '0.95fr 1.25fr',
        gap: 24,
        height: '100%',
      }}
    >
      {/* Left: Template Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, color: THEME.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText className="w-5 h-5 text-blue-400" />
          {copy.studioTitle}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {copy.templates.map((tpl, idx) => {
            const isSel = idx === activeTemplate;
            return (
              <div
                key={tpl.name}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isSel ? THEME.accentMuted : THEME.surface100,
                  border: `1.5px solid ${isSel ? THEME.accentLight : THEME.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: THEME.textSecondary, marginTop: 2 }}>{tpl.tag}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: tpl.accent, border: '2px solid #fff' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.emeraldLight }}>{tpl.score}/100</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ATS Auditor Badge */}
        <div style={{ padding: 14, borderRadius: 12, backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textPrimary }}>{copy.scoreLabel}</span>
          </div>
          <span style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, color: THEME.emeraldLight }}>
            {current.score} / 100
          </span>
        </div>
      </div>

      {/* Right: Live A4 Document Preview */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 24,
          color: '#0f172a',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
          display: activeTemplate === 1 ? 'grid' : 'flex',
          gridTemplateColumns: activeTemplate === 1 ? '0.36fr 0.64fr' : undefined,
          flexDirection: activeTemplate === 1 ? undefined : 'column',
          gap: 18,
          overflow: 'hidden',
        }}
      >
        {activeTemplate === 1 ? (
          <>
            {/* 2-Column Split Preview */}
            <div style={{ backgroundColor: '#f1f5f9', borderRadius: 8, padding: 14, borderRight: `3px solid ${current.accent}` }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Alex Morgan</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: current.accent, marginTop: 2 }}>{copy.role2Col}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 10 }}>alex@example.com</div>
              <div style={{ fontSize: 10, color: '#475569' }}>{copy.remoteEu}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: current.accent, marginTop: 16, textTransform: 'uppercase' }}>{copy.skillsLabel}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {['TypeScript', 'React', 'Python', 'FastAPI', 'AWS', 'Docker'].map(s => (
                  <span key={s} style={{ fontSize: 9, padding: '2px 6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: 4 }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <CVSection title={copy.summaryLabel} accent={current.accent}>
                {copy.summary2Col}
              </CVSection>
              <CVSection title={copy.experienceLabel} accent={current.accent}>
                <strong>{copy.exp2ColTitle}</strong>
                <br />{copy.exp2ColB1}
                <br />{copy.exp2ColB2}
              </CVSection>
            </div>
          </>
        ) : (
          <>
            {/* Linear Classic ATS or Tech Minimal */}
            <div style={{ borderBottom: `2px ${activeTemplate === 2 ? 'dashed' : 'solid'} ${current.accent}`, paddingBottom: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Alex Morgan</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: current.accent }}>{copy.role1Col}</div>
            </div>
            <CVSection title={copy.summaryShortLabel} accent={current.accent}>
              {copy.summary1Col}
            </CVSection>
            <CVSection title={copy.coreStackLabel} accent={current.accent}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {['TypeScript', 'React', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Kubernetes'].map(s => (
                  <span
                    key={s}
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderLeft: activeTemplate === 2 ? `3px solid ${current.accent}` : '1px solid #cbd5e1',
                      fontFamily: activeTemplate === 2 ? 'monospace' : 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </CVSection>
            <CVSection title={copy.experienceLabel} accent={current.accent}>
              <strong>{copy.exp1ColTitle}</strong>
              <br />{copy.exp1ColB1}
            </CVSection>
          </>
        )}
      </div>
    </div>
  );
};

const CVSection: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: 3, marginBottom: 6 }}>
      {title}
    </div>
    <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.5 }}>{children}</div>
  </div>
);

/* ---------------- FEATURE 5: MULTI-LANGUAGE SUPPORT ---------------- */
const Feature5Language: React.FC<{ lang: LangCode; isVertical: boolean; instantBadge: string }> = ({ lang, isVertical, instantBadge }) => {
  const copy = LOCALIZED_DASHBOARD[lang];
  const values = ['42', '14', '5'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      <div
        style={{
          padding: 18,
          borderRadius: 14,
          backgroundColor: THEME.surface100,
          border: `1px solid ${THEME.border}`,
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: isVertical ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: THEME.textPrimary }}>
            {copy.title}
          </div>
          <div style={{ fontSize: 13, color: THEME.textSecondary, marginTop: 4 }}>{copy.subtitle}</div>
        </div>
        <div style={{ padding: '10px 18px', borderRadius: 10, backgroundColor: THEME.accent, color: '#fff', fontSize: 13, fontWeight: 700 }}>
          {copy.cta}
        </div>
      </div>

      {/* KPI Cards showing instant translation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {copy.kpis.map((label, idx) => (
          <div key={label} style={{ padding: 18, borderRadius: 14, backgroundColor: THEME.surface100, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 600 }}>{label}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: 34, fontWeight: 700, color: THEME.textPrimary, marginTop: 8 }}>
              {values[idx]}
            </div>
          </div>
        ))}
      </div>

      {/* Active Language Feedback Banner */}
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          backgroundColor: THEME.accentMuted,
          border: `1px solid ${THEME.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: THEME.textPrimary }}>
          <Globe className="w-5 h-5 text-blue-400" />
          <span>{copy.langBanner}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: THEME.emeraldLight, fontWeight: 600 }}>
          <TrendingUp className="w-4 h-4" />
          <span>{instantBadge}</span>
        </div>
      </div>
    </div>
  );
};
