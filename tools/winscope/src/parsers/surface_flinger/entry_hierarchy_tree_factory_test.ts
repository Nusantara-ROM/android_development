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

import {assertDefined} from 'common/assert_utils';
import {Rect} from 'common/geometry/rect';
import {Region} from 'common/geometry/region';
import {
  DuplicateLayerIds,
  MissingLayerIds,
  RecursiveLayerIds,
} from 'messaging/user_warnings';
import {TraceRect} from 'trace/trace_rect';
import {HierarchyTreeNode} from 'trace/tree_node/hierarchy_tree_node';
import {QueryResult, RowIterator} from 'trace_processor/query_result';
import {makeSpyRowIterator} from 'trace_processor/test_utils';
import {TraceProcessor} from 'trace_processor/trace_processor';
import {EntryHierarchyTreeFactory} from './entry_hierarchy_tree_factory';
import {RectExtractor} from './rect_extractor';

describe('EntryHierarchyTreeFactory', () => {
  const factory = new EntryHierarchyTreeFactory();
  const traceProcessor = jasmine.createSpyObj<TraceProcessor>(
    'traceProcessor',
    ['query'],
  );
  const layerName1 = 'Layer1';

  let displaysSpy: jasmine.Spy;
  let layerRectsSpy: jasmine.Spy;
  let snapshotResult: jasmine.SpyObj<QueryResult>;
  let snapshotIter: jasmine.SpyObj<RowIterator>;
  let layersResult: jasmine.SpyObj<QueryResult>;
  let layersIter: jasmine.SpyObj<RowIterator>;

  beforeEach(() => {
    snapshotIter = makeSpyRowIterator();
    snapshotIter.get.withArgs('arg_set_id').and.returnValue(1n);
    snapshotResult = jasmine.createSpyObj<QueryResult>('result', ['iter']);
    snapshotResult.iter.and.returnValue(snapshotIter);

    layersIter = makeSpyRowIterator();
    setColumnValuesForLayer();
    layersResult = jasmine.createSpyObj<QueryResult>('result', ['iter']);
    layersResult.iter.and.returnValue(layersIter);

    displaysSpy = spyOn(RectExtractor, 'extractDisplayRects').and.returnValue(
      [],
    );
    layerRectsSpy = spyOn(RectExtractor, 'extractLayerRects').and.returnValue(
      undefined,
    );
  });

  describe('rects', () => {
    const spyRect = jasmine.createSpyObj<TraceRect>('rect', [], ['x']);

    it('sets bounds rect to node', () => {
      layerRectsSpy.and.returnValue({bounds: spyRect});
      const tree = makeEntryHierarchyTree();
      const layer = assertDefined(tree.getChildByName(layerName1));
      expect(layer.getRects()).toEqual([spyRect]);
      expect(layer.getSecondaryRects()).toBeUndefined();
    });

    it('sets input rect to node', () => {
      layerRectsSpy.and.returnValue({input: spyRect});
      const tree = makeEntryHierarchyTree();
      const layer = assertDefined(tree.getChildByName(layerName1));
      expect(layer.getRects()).toBeUndefined();
      expect(layer.getSecondaryRects()).toEqual([spyRect]);
    });

    it('sets both bounds and input rects to node', () => {
      const spyRectOther = jasmine.createSpyObj<TraceRect>('rect', [], ['y']);
      layerRectsSpy.and.returnValue({bounds: spyRect, input: spyRectOther});
      const tree = makeEntryHierarchyTree();
      const layer = assertDefined(tree.getChildByName(layerName1));
      expect(layer.getRects()).toEqual([spyRect]);
      expect(layer.getSecondaryRects()).toEqual([spyRectOther]);
    });

    it('adds fill region rects to input rect', () => {
      let calls = 0;
      layersIter.next.and.callFake(() => {
        if (calls === 2) {
          layersIter.valid.and.returnValue(false);
          return;
        }
        calls++;
        layersIter.get.withArgs('fr_x').and.returnValue(1 * calls);
        layersIter.get.withArgs('fr_y').and.returnValue(2 * calls);
        layersIter.get.withArgs('fr_w').and.returnValue(3 * calls);
        layersIter.get.withArgs('fr_h').and.returnValue(4 * calls);
      });

      const spyRectWithFillRegion = jasmine.createSpyObj<TraceRect>(
        'rect',
        [],
        {'fillRegion': new Region([])},
      );

      layerRectsSpy.and.returnValue({input: spyRectWithFillRegion});

      const tree = makeEntryHierarchyTree();
      const layer = assertDefined(tree.getChildByName(layerName1));
      expect(layer.getRects()).toBeUndefined();

      const expectedRect = jasmine.createSpyObj<TraceRect>('rect', [], {
        fillRegion: new Region([new Rect(1, 2, 3, 4), new Rect(2, 4, 6, 8)]),
      });
      expect(layer.getSecondaryRects()).toEqual([expectedRect]);
    });

    it('sets display rects to root', () => {
      displaysSpy.and.returnValue([spyRect, spyRect]);
      const tree = makeEntryHierarchyTree();
      expect(tree.getRects()).toEqual([spyRect, spyRect]);
    });
  });

  describe('warnings', () => {
    it('handles missing layer ids', () => {
      layersIter.get.withArgs('layer_id').and.returnValue(null);
      let calls = 0;
      layersIter.next.and.callFake(() => {
        if (calls !== 0) {
          layersIter.valid.and.returnValue(false);
          return;
        }
        calls++;
        layersIter.get.withArgs('layer_id').and.returnValue(1n);
      });

      const tree = makeEntryHierarchyTree();
      expect(tree.getAllChildren().length).toEqual(1);
      expect(tree.getChildByName(layerName1)).toBeDefined();
      expect(tree.getWarnings()).toEqual([new MissingLayerIds()]);
    });

    it('handles duplicate layer ids', () => {
      let calls = 0;
      layersIter.next.and.callFake(() => {
        if (calls !== 0) {
          layersIter.valid.and.returnValue(false);
          return;
        }
        calls++;
        layersIter.get.withArgs('id').and.returnValue(1n);
      });

      const tree = makeEntryHierarchyTree();
      expect(tree.getAllChildren().length).toEqual(2);
      expect(tree.getChildByName(layerName1)).toBeDefined();
      expect(tree.getChildByName(layerName1 + ' duplicate(1)')).toBeDefined();
      expect(tree.getWarnings()).toEqual([new DuplicateLayerIds([1])]);
    });

    it('handles recursive layer ids', () => {
      layersIter.get.withArgs('parent').and.returnValue(1n);
      let calls = 0;
      layersIter.next.and.callFake(() => {
        if (calls !== 0) {
          layersIter.valid.and.returnValue(false);
          return;
        }
        calls++;
        layersIter.get.withArgs('id').and.returnValue(1n);
        layersIter.get.withArgs('layer_id').and.returnValue(7n);
        layersIter.get.withArgs('parent').and.returnValue(7n);
      });

      const tree = makeEntryHierarchyTree();
      const recursiveLayers = tree.getAllChildren()[0].getAllChildren();
      expect(
        recursiveLayers.map((c) =>
          c.getEagerPropertyByName('layerId')?.getValue(),
        ),
      ).toEqual([1n, 7n]);
      expect(
        recursiveLayers.map((c) =>
          c.getEagerPropertyByName('parent')?.getValue(),
        ),
      ).toEqual([1n, 7n]);
      expect(tree.getWarnings()).toEqual([new RecursiveLayerIds([1, 7])]);
    });
  });

  function setColumnValuesForLayer() {
    layersIter.get.withArgs('id').and.returnValue(0n);
    layersIter.get.withArgs('layer_id').and.returnValue(1n);
    layersIter.get.withArgs('layer_name').and.returnValue(layerName1);
    layersIter.get.withArgs('arg_set_id').and.returnValue(2n);
    layersIter.get.withArgs('is_visible').and.returnValue(0n);
    layersIter.get.withArgs('parent').and.returnValue(-1n);
    layersIter.get.withArgs('hwc_composition_type').and.returnValue(0n);
    layersIter.get.withArgs('is_hidden_by_policy').and.returnValue(0n);
    layersIter.get.withArgs('z_order_relative_of').and.returnValue(0n);
    layersIter.get.withArgs('is_missing_z_parent').and.returnValue(0n);
  }

  function makeEntryHierarchyTree(): HierarchyTreeNode {
    return factory.makeEntryHierarchyTree(
      snapshotResult,
      layersResult,
      traceProcessor,
    );
  }
});
