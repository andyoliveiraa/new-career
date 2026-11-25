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
      />
      <Composition
        id="PromoVertical"
        component={PromoVideoComposition}
        durationInFrames={1800}
        fps={60}
        width={1080}
        height={1920}
      />
    </>
  );
};
