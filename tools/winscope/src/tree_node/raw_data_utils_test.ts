/*
 * Copyright (C) 2024 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {assertDefined} from 'common/assert_utils';
import {PropertyTreeBuilder} from 'test/unit/property_tree_builder';
import {
  makeBufferNode,
  makeColorNode,
  makePositionNode,
  makeRectNode,
  makeSizeNode,
} from 'test/unit/tree_node_utils';
import {
  isBuffer,
  isColor,
  isEmptyObj,
  isPosition,
  isRect,
  isRegion,
  isSize,
} from './raw_data_utils';

describe('RawDataUtils', () => {
  it('identifies color', () => {
    const color = makeColorNode(0, 0, 0, 1);
    expect(isColor(color)).toBeTrue();

    const colorOnlyA = makeColorNode(undefined, undefined, undefined, 1);
    expect(isColor(colorOnlyA)).toBeTrue();
  });

  it('identifies rect', () => {
    const rect = makeRectNode(0, 0, 1, 1);
    expect(isRect(rect)).toBeTrue();

    const rectLeftTop = makeRectNode(0, 0, undefined, undefined);
    expect(isRect(rectLeftTop)).toBeTrue();

    const rectRightBottom = makeRectNode(undefined, undefined, 1, 1);
    expect(isRect(rectRightBottom)).toBeTrue();
  });

  it('identifies buffer', () => {
    const buffer = makeBufferNode();
    expect(isBuffer(buffer)).toBeTrue();
  });

  it('identifies size', () => {
    const size = makeSizeNode(0, 0);
    expect(isSize(size)).toBeTrue();
    expect(isBuffer(size)).toBeFalse();

    const sizeOnlyW = makeSizeNode(0, undefined);
    expect(isSize(sizeOnlyW)).toBeTrue();

    const sizeOnlyH = makeSizeNode(undefined, 0);
    expect(isSize(sizeOnlyH)).toBeTrue();

    const notSize = new PropertyTreeBuilder()
      .setRootId('test node')
      .setName('size')
      .setChildren([
        {name: 'w', value: 0},
        {name: 'h', value: 0},
        {name: 'x', value: 0},
        {name: 'y', value: 0},
      ])
      .build();

    expect(isSize(notSize)).toBeFalse();
  });

  it('identifies position', () => {
    const pos = makePositionNode(0, 0);
    expect(isPosition(pos)).toBeTrue();
    expect(isRect(pos)).toBeFalse();

    const posOnlyX = makePositionNode(0, undefined);
    expect(isPosition(posOnlyX)).toBeTrue();

    const posOnlyY = makePositionNode(undefined, 0);
    expect(isPosition(posOnlyY)).toBeTrue();

    const notPos = new PropertyTreeBuilder()
      .setRootId('test node')
      .setName('pos')
      .setChildren([
        {name: 'w', value: 0},
        {name: 'h', value: 0},
        {name: 'x', value: 0},
        {name: 'y', value: 0},
      ])
      .build();

    expect(isPosition(notPos)).toBeFalse();
  });

  it('identifies region', () => {
    const region = new PropertyTreeBuilder()
      .setRootId('test node')
      .setName('region')
      .setChildren([{name: 'rect', value: []}])
      .build();
    expect(isRegion(region)).toBeTrue();

    const rectNode = assertDefined(region.getChildByName('rect'));
    rectNode.addOrReplaceChild(makeRectNode(0, 0, 1, 1, rectNode.id));
    rectNode.addOrReplaceChild(
      makeRectNode(0, 0, undefined, undefined, rectNode.id),
    );
    rectNode.addOrReplaceChild(
      makeRectNode(undefined, undefined, 1, 1, rectNode.id),
    );
    expect(isRegion(region)).toBeTrue();

    rectNode.addOrReplaceChild(makeColorNode(0, 0, 0, 0));
    expect(isRegion(region)).toBeFalse();
  });

  describe('identifies empty object', () => {
    it('rect', () => {
      const rectWithUndefinedValues = makeRectNode(0, 0, undefined, undefined);
      expect(isEmptyObj(rectWithUndefinedValues)).toBeTrue();

      const rectAllZeroValues = makeRectNode(0, 0, 0, 0);
      expect(isEmptyObj(rectAllZeroValues)).toBeTrue();

      const rectWithMinusOneValues = makeRectNode(0, 0, -1, -1);
      expect(isEmptyObj(rectWithMinusOneValues)).toBeTrue();
    });

    it('color', () => {
      const bMinusOne = makeColorNode(153, 23, -1, 1);
      expect(isEmptyObj(bMinusOne)).toBeTrue();

      const rgbMinusOne = makeColorNode(-1, -1, -1, 0.9);
      expect(isEmptyObj(rgbMinusOne)).toBeTrue();

      const alphaZero = makeColorNode(1, 1, 1, 0);
      expect(isEmptyObj(alphaZero)).toBeTrue();
    });
  });

  describe('identifies non-empty object', () => {
    it('rect', () => {
      const rect = makeRectNode(0, 0, 1, 1);
      expect(isEmptyObj(rect)).toBeFalse();
    });

    it('color', () => {
      const color = makeColorNode(0, 8, 0, 1);
      expect(isEmptyObj(color)).toBeFalse();

      const missingB = makeColorNode(153, 23, undefined, 1);
      expect(isEmptyObj(missingB)).toBeFalse();

      const rgbZeroAlphaNonZero = makeColorNode(0, 0, 0, 0.7);
      expect(isEmptyObj(rgbZeroAlphaNonZero)).toBeFalse();

      const rgbZeroAlphaOne = makeColorNode(0, 0, 0, 1);
      expect(isEmptyObj(rgbZeroAlphaOne)).toBeFalse();
    });
  });
});
