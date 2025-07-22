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

import {
  assertBigIntOrUndefined,
  assertNumber,
  assertNumberOrUndefined,
  assertStringOrUndefined,
} from 'common/assert_utils';
import {Rect} from 'common/geometry/rect';
import {TraceRectBuilderFromQueryRow} from 'parsers/trace_rect_builder_from_query_row';
import {QueryResult, RowIterator} from 'trace_processor/query_result';
import {TraceRect} from 'tree_node/trace_rect';

export class RectExtractor {
  static extractDisplayRects(snapshotResult: QueryResult): TraceRect[] {
    const displayRects = [];
    for (const it = snapshotResult.iter({}); it.valid(); it.next()) {
      const displayId = assertBigIntOrUndefined(
        it.get('display_id') ?? undefined,
      );
      if (displayId === undefined) {
        continue;
      }
      const displayIdString = displayId.toString();
      const isActiveDisplay = it.get('is_on') && !it.get('is_virtual');
      const name = assertStringOrUndefined(it.get('display_name') ?? undefined);

      const rect = new TraceRectBuilderFromQueryRow()
        .setRow(it)
        .setId('Display - ' + displayIdString)
        .setName(name ?? 'Unknown Display')
        .setIsDisplay(true)
        .setIsActiveDisplay(!!isActiveDisplay)
        .setExtractMatrix(false)
        .build();
      displayRects.push(rect);
    }
    return displayRects;
  }

  static extractFillRegionRect(row: RowIterator): Rect | undefined {
    const fillRegionX = assertNumberOrUndefined(row.get('fr_x') ?? undefined);
    if (fillRegionX === undefined) {
      return undefined;
    }
    return new Rect(
      fillRegionX,
      assertNumber(row.get('fr_y')),
      assertNumber(row.get('fr_w')),
      assertNumber(row.get('fr_h')),
    );
  }

  static extractLayerRects(
    row: RowIterator,
    rectId: string,
    layerName: string,
  ): LayerRects | undefined {
    const bounds = RectExtractor.extractBoundsRect(row, rectId, layerName);
    const input = RectExtractor.extractInputRect(row, rectId, layerName);
    if (!bounds && !input) {
      return undefined;
    }
    return {bounds, input};
  }

  private static extractBoundsRect(
    row: RowIterator,
    rectId: string,
    layerName: string,
  ): TraceRect | undefined {
    const groupId = assertBigIntOrUndefined(row.get('group_id') ?? undefined);
    if (groupId === undefined) {
      return undefined;
    }
    return new TraceRectBuilderFromQueryRow()
      .setRow(row)
      .setId(rectId)
      .setName(layerName)
      .setExtractCornerRadii(true)
      .setExtractOpacity(true)
      .build();
  }

  private static extractInputRect(
    row: RowIterator,
    rectId: string,
    layerName: string,
  ): TraceRect | undefined {
    const groupId = assertBigIntOrUndefined(
      row.get('input_group_id') ?? undefined,
    );
    if (groupId === undefined) {
      return undefined;
    }

    const builder = new TraceRectBuilderFromQueryRow()
      .setRow(row)
      .setId(rectId)
      .setName(layerName)
      .setRectColumns(['input_x', 'input_y', 'input_w', 'input_h'])
      .setGroupIdColumn('input_group_id')
      .setDepthColumn('input_depth')
      .setIsVisibleColumn('input_is_visible')
      .setExtractIsSpy(true);

    const fillRegionRect = RectExtractor.extractFillRegionRect(row);
    if (fillRegionRect) {
      builder.addFillRegionRect(fillRegionRect);
    }

    return builder.build();
  }
}

export interface LayerRects {
  bounds?: TraceRect;
  input?: TraceRect;
}
