import Log from '@deephaven/log';
import { initializeVirtualWebGL } from './virtual-webgl';

const log = Log.module('@deephaven/chart index');

try {
  // Used to show many WebGL plots on the same page
  // https://github.com/plotly/plotly.js/?tab=readme-ov-file#need-to-have-several-webgl-graphs-on-a-page
  initializeVirtualWebGL();
} catch (e) {
  log.warn('Failed to initialize virtual WebGL', e);
}

export { default as Chart } from './LazyChart';
export { default as ChartModelFactory } from './ChartModelFactory';
export { default as ChartModel } from './ChartModel';
export { default as ChartUtils } from './ChartUtils';
export * from './ChartUtils';
export * from './DownsamplingError';
export { default as FigureChartModel } from './FigureChartModel';
export { default as MockChartModel } from './MockChartModel';
export { default as Plot } from './plotly/LazyPlot';
export * from './ChartTheme';
export * from './ChartThemeProvider';
export { default as isFigureChartModel } from './isFigureChartModel';
export * from './useChartTheme';
