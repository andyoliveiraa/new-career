import React from 'react';
import { Composition } from 'remotion';
import { PromoVideoComposition } from './PromoVideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoHorizontal"
        component={PromoVideoComposition}
        durationInFrames={1800}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ videoLang: 'en' as const }}
      />
      <Composition
        id="PromoVertical"
        component={PromoVideoComposition}
        durationInFrames={1800}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ videoLang: 'en' as const }}
      />
      <Composition
        id="PromoHorizontalPT"
        component={PromoVideoComposition}
        durationInFrames={1800}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ videoLang: 'pt' as const }}
      />
      <Composition
        id="PromoVerticalPT"
        component={PromoVideoComposition}
        durationInFrames={1800}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ videoLang: 'pt' as const }}
      />
    </>
  );
};
