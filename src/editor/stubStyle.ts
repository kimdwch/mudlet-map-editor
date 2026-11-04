import type {Style} from 'mudlet-map-renderer';

const STUB_COLOR = '#ff0000';
const STUB_DASH = [0.08, 0.08];
export const ONE_WAY_ARROW_SCALE = 0.3;

function isOneWayExit(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const {aDir, bDir} = payload as {aDir?: unknown; bDir?: unknown};
  return (aDir == null) !== (bDir == null);
}

export const editorMapStyle: Style = {
  transform(shape) {
    if (shape.type !== 'group') return shape;

    if (shape.hit?.kind === 'exit' && isOneWayExit(shape.hit.payload)) {
      return {
        ...shape,
        children: shape.children.map((child) => {
          if (child.type !== 'polygon' || child.vertices.length < 6) return child;
          const [tipX, tipY, ...head] = child.vertices;
          return {
            ...child,
            vertices: [
              tipX,
              tipY,
              ...head.map((coordinate, index) => {
                const tip = index % 2 === 0 ? tipX : tipY;
                return tip + (coordinate - tip) * ONE_WAY_ARROW_SCALE;
              }),
            ],
            paint: {
              ...child.paint,
              strokeWidth: child.paint.strokeWidth == null
                ? undefined
                : child.paint.strokeWidth * ONE_WAY_ARROW_SCALE,
            },
          };
        }),
      };
    }

    if (shape.hit?.kind !== 'stub') return shape;
    return {
      ...shape,
      children: shape.children.map((child) => {
        if (child.type !== 'line') return child;
        return {
          ...child,
          lineCap: 'round',
          paint: {
            ...child.paint,
            stroke: STUB_COLOR,
            dash: STUB_DASH,
            dashEnabled: true,
          },
        };
      }),
    };
  },
};
