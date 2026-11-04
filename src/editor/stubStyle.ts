import type {Style} from 'mudlet-map-renderer';

const STUB_COLOR = '#ff0000';
const STUB_DASH = [0.08, 0.08];

export const stubStyle: Style = {
  transform(shape) {
    if (shape.type !== 'group' || shape.hit?.kind !== 'stub') return shape;

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
