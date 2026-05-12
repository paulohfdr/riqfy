import React from 'react';
import { Composition } from 'remotion';
import { RiqFyVideo } from './RiqFyVideo';
import { TOTAL_FRAMES, FPS } from './constants';

export const Root: React.FC = () => (
  <Composition
    id="RiqFy"
    component={RiqFyVideo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
