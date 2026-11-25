import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { VideoLang } from './copy';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Reveal } from './scenes/Scene2Reveal';
import { Scene3FeatureShowcase } from './scenes/Scene3FeatureShowcase';
import { Scene4Highlights } from './scenes/Scene4Highlights';
import { Scene5CTA } from './scenes/Scene5CTA';
import { Scene6OpenSourceBeta } from './scenes/Scene6OpenSourceBeta';
import { THEME } from './theme';

export type PromoVideoProps = {
  videoLang?: VideoLang;
};

export const PromoVideoComposition: React.FC<PromoVideoProps> = ({ videoLang = 'en' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
      {/* Scene 1: 0s - 3.5s (0 - 210) */}
      <Sequence from={0} durationInFrames={210}>
        <Scene1Hook videoLang={videoLang} />
      </Sequence>

      {/* Scene 2: 3.5s - 7s (210 - 420) */}
      <Sequence from={210} durationInFrames={210}>
        <Scene2Reveal videoLang={videoLang} />
      </Sequence>

      {/* Scene 3: 7s - 21.17s (420 - 1270, 5 features x 170 frames) */}
      <Sequence from={420} durationInFrames={850}>
        <Scene3FeatureShowcase videoLang={videoLang} />
      </Sequence>

      {/* Scene 4: 21.17s - 24.17s (1270 - 1450) */}
      <Sequence from={1270} durationInFrames={180}>
        <Scene4Highlights videoLang={videoLang} />
      </Sequence>

      {/* Scene 5: 24.17s - 27s (1450 - 1620) */}
      <Sequence from={1450} durationInFrames={170}>
        <Scene5CTA videoLang={videoLang} />
      </Sequence>

      {/* Scene 6: 27s - 30s (1620 - 1800) | Open Source & Beta */}
      <Sequence from={1620} durationInFrames={180}>
        <Scene6OpenSourceBeta videoLang={videoLang} />
      </Sequence>
    </AbsoluteFill>
  );
};
