import Konva from 'konva';
import type {CoordinateTransform, DrawnExitEntry, LiveEffect, ViewportBounds} from 'mudlet-map-renderer';
import {ONE_WAY_ARROW_SCALE} from '../stubStyle';

export class OneWayExitOverlayEffect implements LiveEffect {
  private layer?: Konva.Layer;
  private nodes: Konva.Shape[] = [];

  constructor(private readonly getDrawnExits: () => readonly DrawnExitEntry[]) {}

  attach(layer: Konva.Layer): void {
    this.layer = layer;
    this.sync();
  }

  updateViewport(_bounds: ViewportBounds, _scale: number, _transform: CoordinateTransform): void {
    this.sync();
  }

  sync(): void {
    if (!this.layer) return;
    this.clear();

    for (const exit of this.getDrawnExits()) {
      if (!isOneWayExit(exit) || exit.kind !== 'exit') continue;
      const lineColor = exit.data.lines[0]?.stroke;

      for (const line of exit.data.lines) {
        const node = new Konva.Line({
          points: [...line.points],
          stroke: line.stroke,
          strokeWidth: line.strokeWidth,
          dash: line.dash ? [...line.dash] : undefined,
          listening: false,
          perfectDrawEnabled: false,
        });
        this.layer.add(node);
        this.nodes.push(node);
      }

      for (const arrow of exit.data.arrows) {
        const node = new Konva.Arrow({
          points: [...arrow.points],
          stroke: arrow.stroke,
          fill: lineColor ?? arrow.fill,
          strokeWidth: arrow.strokeWidth,
          dash: arrow.dash ? [...arrow.dash] : undefined,
          pointerLength: arrow.pointerLength * ONE_WAY_ARROW_SCALE,
          pointerWidth: arrow.pointerWidth * ONE_WAY_ARROW_SCALE,
          listening: false,
          perfectDrawEnabled: false,
        });
        this.layer.add(node);
        this.nodes.push(node);
      }
    }

    for (const node of this.nodes) node.moveToTop();
    this.layer.batchDraw();
  }

  destroy(): void {
    this.clear();
    this.layer = undefined;
  }

  private clear(): void {
    for (const node of this.nodes) node.destroy();
    this.nodes = [];
  }
}

function isOneWayExit(exit: DrawnExitEntry): boolean {
  return (exit.aDir == null) !== (exit.bDir == null);
}
