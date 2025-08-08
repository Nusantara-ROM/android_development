/*
 * Copyright (C) 2025 The Android Open Source Project
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

import {CornerRadii} from 'common/geometry/corner_radii';
import {Rect} from 'common/geometry/rect';
import {Region} from 'common/geometry/region';
import {
  IDENTITY_MATRIX,
  TransformMatrix,
} from 'common/geometry/transform_matrix';
import {QueryResult, RowIterator} from 'trace_processor/query_result';
import {makeSpyRowIterator} from 'trace_processor/test_utils';
import {TraceRect} from 'tree_node/trace_rect';
import {TraceRectBuilder} from 'tree_node/trace_rect_builder';
import {RectExtractor} from './rect_extractor';

describe('SurfaceFlinger RectExtractor', () => {
  const expectedMatrix = TransformMatrix.from({
    dsdx: 1,
    dtdx: 2,
    tx: 3,
    dtdy: 4,
    dsdy: 5,
    ty: 6,
  });
  const rectId1 = 'RectId1';
  const rectName1 = 'RectName1';

  describe('extractLayerRects', () => {
    let layersIter: jasmine.SpyObj<RowIterator>;

    beforeEach(() => {
      layersIter = makeSpyRowIterator();
    });

    it('extracts bounds rect with corner radius and opacity', () => {
      setColumnValuesForLayerRect();
      const expectedRect = makeExpectedLayerRect();
      checkLayerRectsExtracted(expectedRect);
    });

    it('does not set bounds rect if null group_id', () => {
      setColumnValuesForLayerRect();
      layersIter.get.withArgs('group_id').and.returnValue(null);
      checkLayerRectsExtracted();
    });

    it('extracts input rect with is_spy', () => {
      setColumnValuesForInputRect();
      const expectedRect = makeExpectedInputRect();
      checkLayerRectsExtracted(undefined, expectedRect);
    });

    it('adds fill region rects to input rect', () => {
      setColumnValuesForInputRect();
      layersIter.get.withArgs('fr_x').and.returnValue(1);
      layersIter.get.withArgs('fr_y').and.returnValue(2);
      layersIter.get.withArgs('fr_w').and.returnValue(3);
      layersIter.get.withArgs('fr_h').and.returnValue(4);
      const expectedRect = makeExpectedInputRect([new Rect(1, 2, 3, 4)]);
      checkLayerRectsExtracted(undefined, expectedRect);
    });

    it('does not set input rect if null group_id', () => {
      setColumnValuesForInputRect();
      layersIter.get.withArgs('input_group_id').and.returnValue(null);
      checkLayerRectsExtracted();
    });

    it('extracts both input rect and bounds rect', () => {
      setColumnValuesForLayerRect(false);
      setColumnValuesForInputRect(false);
      const expectedBoundRect = makeExpectedLayerRect();
      const expectedInputRect = makeExpectedInputRect();
      checkLayerRectsExtracted(expectedBoundRect, expectedInputRect);
    });

    function setColumnValuesForLayerRect(noInputRect = true) {
      setCommonColumnValuesForLayer();
      layersIter.get.withArgs('x').and.returnValue(1);
      layersIter.get.withArgs('y').and.returnValue(1);
      layersIter.get.withArgs('w').and.returnValue(200);
      layersIter.get.withArgs('h').and.returnValue(400);
      layersIter.get.withArgs('is_visible').and.returnValue(1n);
      layersIter.get.withArgs('group_id').and.returnValue(3n);
      layersIter.get.withArgs('depth').and.returnValue(5n);
      if (noInputRect) {
        layersIter.get.withArgs('input_group_id').and.returnValue(null);
      }
    }

    function setColumnValuesForInputRect(noLayerRect = true) {
      setCommonColumnValuesForLayer();
      layersIter.get.withArgs('input_x').and.returnValue(2);
      layersIter.get.withArgs('input_y').and.returnValue(2);
      layersIter.get.withArgs('input_w').and.returnValue(400);
      layersIter.get.withArgs('input_h').and.returnValue(200);
      layersIter.get.withArgs('input_is_visible').and.returnValue(0n);
      layersIter.get.withArgs('input_group_id').and.returnValue(4n);
      layersIter.get.withArgs('input_depth').and.returnValue(3n);
      layersIter.get.withArgs('fr_x').and.returnValue(null);
      if (noLayerRect) {
        layersIter.get.withArgs('group_id').and.returnValue(null);
      }
    }

    function setCommonColumnValuesForLayer() {
      layersIter.get.withArgs('layer_id').and.returnValue(1n);
      layersIter.get.withArgs('opacity').and.returnValue(0.5);
      layersIter.get.withArgs('is_spy').and.returnValue(1n);
      layersIter.get.withArgs('corner_radius_tl').and.returnValue(0.25);
      layersIter.get.withArgs('corner_radius_tr').and.returnValue(null);
      layersIter.get.withArgs('corner_radius_bl').and.returnValue(0.5);
      layersIter.get.withArgs('corner_radius_br').and.returnValue(null);
      layersIter.get.withArgs('dsdx').and.returnValue(1);
      layersIter.get.withArgs('dtdx').and.returnValue(2);
      layersIter.get.withArgs('tx').and.returnValue(3);
      layersIter.get.withArgs('dtdy').and.returnValue(4);
      layersIter.get.withArgs('dsdy').and.returnValue(5);
      layersIter.get.withArgs('ty').and.returnValue(6);
    }

    function makeExpectedLayerRect(id = rectId1, name = rectName1): TraceRect {
      return new TraceRectBuilder()
        .setX(1)
        .setY(1)
        .setWidth(200)
        .setHeight(400)
        .setId(id)
        .setName(name)
        .setCornerRadii(new CornerRadii(0.25, 0, 0.5, 0))
        .setTransform(expectedMatrix)
        .setGroupId(3)
        .setIsVisible(true)
        .setIsDisplay(false)
        .setIsActiveDisplay(false)
        .setDepth(5)
        .setIsSpy(false)
        .setOpacity(0.5)
        .build();
    }

    function makeExpectedInputRect(fillRegion?: Rect[]): TraceRect {
      const builder = new TraceRectBuilder()
        .setX(2)
        .setY(2)
        .setWidth(400)
        .setHeight(200)
        .setId(rectId1)
        .setName(rectName1)
        .setTransform(expectedMatrix)
        .setGroupId(4)
        .setIsVisible(false)
        .setIsDisplay(false)
        .setIsActiveDisplay(false)
        .setDepth(3)
        .setIsSpy(true);
      if (fillRegion) {
        builder.setFillRegion(new Region(fillRegion));
      }
      return builder.build();
    }

    function checkLayerRectsExtracted(
      expectedBoundsRect?: TraceRect,
      expectedInputRect?: TraceRect,
    ) {
      const rects = RectExtractor.extractLayerRects(
        layersIter,
        rectId1,
        rectName1,
      );
      if (!expectedBoundsRect && !expectedInputRect) {
        expect(rects).toBeUndefined();
      } else {
        expect(rects?.bounds).toEqual(expectedBoundsRect);
        expect(rects?.input).toEqual(expectedInputRect);
      }
    }
  });

  describe('extractFillRegionRect', () => {
    let fillRegionIter: jasmine.SpyObj<RowIterator>;

    beforeEach(() => {
      fillRegionIter = makeSpyRowIterator();
    });

    it('extracts fill region rect', () => {
      fillRegionIter.get.withArgs('fr_x').and.returnValue(1);
      fillRegionIter.get.withArgs('fr_y').and.returnValue(2);
      fillRegionIter.get.withArgs('fr_w').and.returnValue(3);
      fillRegionIter.get.withArgs('fr_h').and.returnValue(4);
      const fillRegionRect =
        RectExtractor.extractFillRegionRect(fillRegionIter);
      expect(fillRegionRect).toEqual(new Rect(1, 2, 3, 4));
    });

    it('robust to row without fill region rect', () => {
      const fillRegionRect =
        RectExtractor.extractFillRegionRect(fillRegionIter);
      expect(fillRegionRect).toBeUndefined();
    });
  });

  describe('extractDisplayRects', () => {
    let snapshotResult: jasmine.SpyObj<QueryResult>;
    let snapshotIter: jasmine.SpyObj<RowIterator>;

    beforeEach(() => {
      snapshotIter = makeSpyRowIterator();
      snapshotResult = jasmine.createSpyObj<QueryResult>('result', ['iter']);
      snapshotResult.iter.and.returnValue(snapshotIter);
    });

    it('skips display with null id', () => {
      snapshotIteratorMock([{'display_id': null, 'id': 1n}]);
      checkDisplaysExtracted([]);
    });

    it('extracts display rect with isActiveDisplay not set', () => {
      snapshotIteratorMock([defaultDisplayRow()]);
      const expectedRect = makeExpectedDisplayRect();
      checkDisplaysExtracted([expectedRect]);
    });

    it('extracts display rect with isActiveDisplay set', () => {
      snapshotIteratorMock([defaultDisplayRow({'is_on': true})]);
      const expectedRect = makeExpectedDisplayRect(undefined, true);
      checkDisplaysExtracted([expectedRect]);
    });

    it('extracts display rect with unknown name', () => {
      snapshotIteratorMock([defaultDisplayRow({'display_name': null})]);
      const expectedRect = makeExpectedDisplayRect('Unknown Display');
      checkDisplaysExtracted([expectedRect]);
    });

    it('extracts 2 displays for same snapshot id', () => {
      const display1Values = defaultDisplayRow();
      const display2Values = {
        'display_id': 456n,
        'display_name': 'Display 456',
        'is_on': 1n,
        'is_virtual': 0n,
        'x': 1000,
        'y': 0,
        'w': 800,
        'h': 1800,
        'group_id': 654n,
        'depth': 2n,
        'id': 1n,
      };
      snapshotIteratorMock([display1Values, display2Values]);

      const expectedRect1 = makeExpectedDisplayRect('Display 123', false);
      const expectedRect2 = new TraceRectBuilder()
        .setX(1000)
        .setY(0)
        .setWidth(800)
        .setHeight(1800)
        .setId('Display - 456')
        .setName('Display 456')
        .setTransform(IDENTITY_MATRIX)
        .setGroupId(654)
        .setIsVisible(false)
        .setIsDisplay(true)
        .setIsActiveDisplay(true)
        .setDepth(2)
        .setIsSpy(false)
        .build();

      checkDisplaysExtracted([expectedRect1, expectedRect2]);
    });

    it('stops processing when snapshotId changes', () => {
      snapshotIteratorMock([
        defaultDisplayRow({
          'id': 1n,
          'display_id': 111n,
          'display_name': 'Display 111',
        }),
        defaultDisplayRow({
          'id': 1n,
          'display_id': 222n,
          'display_name': 'Display 222',
        }),
        defaultDisplayRow({
          'id': 2n,
          'display_id': 333n,
          'display_name': 'Display 333',
        }),
      ]);
      const expectedRect1 = makeExpectedDisplayRect('Display 111', false, 111n);
      const expectedRect2 = makeExpectedDisplayRect('Display 222', false, 222n);
      checkDisplaysExtracted([expectedRect1, expectedRect2]);
    });

    it('handles no rows matching targetSnapshotId', () => {
      snapshotIteratorMock([
        defaultDisplayRow({'id': 2n}),
        defaultDisplayRow({'id': 3n}),
      ]);
      checkDisplaysExtracted([]);
    });

    function snapshotIteratorMock(rows: Array<{[key: string]: any}>) {
      let currentRow = 0;
      snapshotIter.valid.and.callFake(() => currentRow < rows.length);
      snapshotIter.next.and.callFake(() => {
        currentRow++;
      });
      snapshotIter.get.and.callFake((key: string) => {
        if (currentRow >= rows.length) {
          return undefined;
        }
        return rows[currentRow][key];
      });
    }

    function defaultDisplayRow(overrides: {[key: string]: any} = {}): {
      [key: string]: any;
    } {
      const defaults = {
        'display_id': 123n,
        'display_name': 'Display 123',
        'is_on': false,
        'is_virtual': 0n,
        'x': 0,
        'y': 0,
        'w': 1000,
        'h': 2000,
        'group_id': 321n,
        'depth': 1n,
        'id': 1n,
      };
      return {...defaults, ...overrides};
    }

    function makeExpectedDisplayRect(
      name = 'Display 123',
      isActive = false,
      displayId = 123n,
    ): TraceRect {
      return new TraceRectBuilder()
        .setX(0)
        .setY(0)
        .setWidth(1000)
        .setHeight(2000)
        .setId(`Display - ${displayId}`)
        .setName(name)
        .setTransform(IDENTITY_MATRIX)
        .setGroupId(321)
        .setIsVisible(false)
        .setIsDisplay(true)
        .setIsActiveDisplay(isActive)
        .setDepth(1)
        .setIsSpy(false)
        .build();
    }

    function checkDisplaysExtracted(expected: TraceRect[]) {
      const {displayRects} = RectExtractor.extractDisplayRectsForSnapshot(
        snapshotResult.iter({}),
        1n,
      );
      expect(displayRects).toEqual(expected);
    }
  });
});
