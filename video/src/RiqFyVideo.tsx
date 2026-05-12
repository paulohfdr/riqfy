import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Intro }     from './scenes/Intro';
import { Dashboard } from './scenes/Dashboard';
import { Features }  from './scenes/Features';
import { Stats }     from './scenes/Stats';
import { CTA }       from './scenes/CTA';
import {
  INTRO_START, DASH_START, FEAT_START,
  STATS_START, CTA_START, TOTAL_FRAMES,
  BG,
} from './constants';

export const RiqFyVideo: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Sequence from={INTRO_START}  durationInFrames={DASH_START  - INTRO_START  + 30}><Intro /></Sequence>
    <Sequence from={DASH_START}   durationInFrames={FEAT_START  - DASH_START   + 30}><Dashboard /></Sequence>
    <Sequence from={FEAT_START}   durationInFrames={STATS_START - FEAT_START   + 30}><Features /></Sequence>
    <Sequence from={STATS_START}  durationInFrames={CTA_START   - STATS_START  + 30}><Stats /></Sequence>
    <Sequence from={CTA_START}    durationInFrames={TOTAL_FRAMES - CTA_START}><CTA /></Sequence>
  </AbsoluteFill>
);
