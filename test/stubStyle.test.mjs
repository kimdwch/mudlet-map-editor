import assert from 'node:assert/strict';
import test from 'node:test';
import {editorMapStyle} from '../src/editor/stubStyle.ts';

test('one-way exit arrowhead is reduced to 30% while its shaft stays unchanged', () => {
  const shaft = {type: 'line', points: [0, 0, 10, 0], paint: {stroke: '#7355cc', strokeWidth: 0.1}};
  const arrowhead = {
    type: 'polygon',
    vertices: [10, 0, 5, -2, 5, 2],
    paint: {fill: '#ffffff', strokeWidth: 0.14},
  };
  const transformed = editorMapStyle.transform({
    type: 'group',
    hit: {kind: 'exit', payload: {a: 1, b: 2, aDir: 'east'}},
    children: [shaft, arrowhead],
  });

  assert.equal(transformed.children[0], shaft);
  assert.deepEqual(transformed.children[1], {
    ...arrowhead,
    vertices: [10, 0, 8.5, -0.6, 8.5, 0.6],
    paint: {fill: '#7355cc', strokeWidth: 0.042},
  });
});

test('two-way exit arrows are left unchanged', () => {
  const shape = {
    type: 'group',
    hit: {kind: 'exit', payload: {aDir: 'east', bDir: 'west'}},
    children: [],
  };
  assert.equal(editorMapStyle.transform(shape), shape);
});
