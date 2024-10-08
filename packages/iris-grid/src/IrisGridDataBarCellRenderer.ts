/* eslint-disable class-methods-use-this */
import {
  type BoxCoordinates,
  type Coordinate,
  DataBarCellRenderer,
} from '@deephaven/grid';
import { type IrisGridRenderState } from './IrisGridRenderer';
import IrisGridCellRendererUtils from './IrisGridCellRendererUtils';

class IrisGridDataBarCellRenderer extends DataBarCellRenderer {
  drawTreeMarker(
    context: CanvasRenderingContext2D,
    state: IrisGridRenderState,
    columnX: Coordinate,
    rowY: Coordinate,
    treeBox: BoxCoordinates,
    color: string,
    isExpanded: boolean
  ): void {
    IrisGridCellRendererUtils.drawTreeMarker(
      context,
      state,
      columnX,
      rowY,
      treeBox,
      color,
      isExpanded
    );
  }
}

export default IrisGridDataBarCellRenderer;
