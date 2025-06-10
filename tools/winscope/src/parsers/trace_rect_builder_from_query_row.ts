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
  assertBigInt,
  assertBigIntOrUndefined,
  assertNumber,
  assertNumberOrUndefined,
} from 'common/assert_utils';
import {Rect} from 'common/geometry/rect';
import {Region} from 'common/geometry/region';
import {
  IDENTITY_MATRIX,
  TransformMatrix,
} from 'common/geometry/transform_matrix';
import {TraceRect} from 'trace/trace_rect';
import {TraceRectBuilder} from 'trace/trace_rect_builder';
import {RowIterator} from 'trace_processor/query_result';

export class TraceRectBuilderFromQueryRow {
  private row: RowIterator | undefined;
  private id: string | undefined;
  private name: string | undefined;
  private isDisplay = false;
  private isActiveDisplay = false;
  private xCol = 'x';
  private yCol = 'y';
  private wCol = 'w';
  private hCol = 'h';
  private isVisibleCol = 'is_visible';
  private groupIdCol = 'group_id';
  private depthCol = 'depth';
  private extractMatrix = true;
  private extractOpacity = false;
  private extractCornerRadius = false;
  private extractIsSpy = false;
  private fillRegion: Region | undefined;

  setRow(value: RowIterator | undefined): this {
    this.row = value;
    return this;
  }

  setId(value: string): this {
    this.id = value;
    return this;
  }

  setName(value: string): this {
    this.name = value;
    return this;
  }

  setIsDisplay(value: boolean): this {
    this.isDisplay = value;
    return this;
  }

  setIsActiveDisplay(value: boolean): this {
    this.isActiveDisplay = value;
    return this;
  }

  setRectColumns(value: string[]): this {
    [this.xCol, this.yCol, this.wCol, this.hCol] = value;
    return this;
  }

  setIsVisibleColumn(value: string): this {
    this.isVisibleCol = value;
    return this;
  }

  setGroupIdColumn(value: string): this {
    this.groupIdCol = value;
    return this;
  }

  setDepthColumn(value: string): this {
    this.depthCol = value;
    return this;
  }

  setExtractMatrix(value: boolean): this {
    this.extractMatrix = value;
    return this;
  }

  setExtractOpacity(value: boolean): this {
    this.extractOpacity = value;
    return this;
  }

  setExtractCornerRadius(value: boolean): this {
    this.extractCornerRadius = value;
    return this;
  }

  setExtractIsSpy(value: boolean): this {
    this.extractIsSpy = value;
    return this;
  }

  addFillRegionRect(rect: Rect): this {
    if (!this.fillRegion) {
      this.fillRegion = Region.createEmpty();
    }
    this.fillRegion.rects.push(rect);
    return this;
  }

  build(): TraceRect {
    if (this.row === undefined) {
      throw new Error('row not set');
    }
    if (this.id === undefined) {
      throw new Error('id not set');
    }
    if (this.name === undefined) {
      throw new Error('name not set');
    }

    const x = assertNumber(this.row.get(this.xCol));
    const y = assertNumber(this.row.get(this.yCol));
    const w = assertNumber(this.row.get(this.wCol));
    const h = assertNumber(this.row.get(this.hCol));

    const cornerRadius = this.extractCornerRadius
      ? assertNumberOrUndefined(this.row.get('corner_radius')) ?? 0
      : 0;
    const isVisible = this.isDisplay
      ? 0n
      : assertBigIntOrUndefined(this.row.get(this.isVisibleCol)) ?? 0n;
    const groupId = assertBigInt(this.row.get(this.groupIdCol));
    const depth = assertBigIntOrUndefined(this.row.get(this.depthCol));
    const isSpy = this.extractIsSpy
      ? assertBigIntOrUndefined(this.row.get('is_spy')) ?? 0n
      : 0n;

    let matrix = IDENTITY_MATRIX;

    if (this.extractMatrix) {
      matrix = TransformMatrix.from({
        dsdx: assertNumberOrUndefined(this.row.get('dsdx')),
        dtdx: assertNumberOrUndefined(this.row.get('dtdx')),
        tx: assertNumberOrUndefined(this.row.get('tx')),
        dtdy: assertNumberOrUndefined(this.row.get('dtdy')),
        dsdy: assertNumberOrUndefined(this.row.get('dsdy')),
        ty: assertNumberOrUndefined(this.row.get('ty')),
      });
    }

    const builder = new TraceRectBuilder()
      .setX(x)
      .setY(y)
      .setWidth(w)
      .setHeight(h)
      .setId(this.id)
      .setName(this.name)
      .setCornerRadius(cornerRadius)
      .setTransform(matrix)
      .setGroupId(Number(groupId))
      .setIsVisible(isVisible !== 0n)
      .setIsDisplay(this.isDisplay)
      .setIsActiveDisplay(this.isActiveDisplay)
      .setDepth(Number(depth))
      .setIsSpy(isSpy !== 0n);

    if (this.extractOpacity) {
      const opacity = assertNumberOrUndefined(this.row.get('opacity'));
      if (opacity !== undefined) {
        builder.setOpacity(opacity);
      }
    }

    if (this.fillRegion) {
      builder.setFillRegion(this.fillRegion);
    }

    return builder.build();
  }
}
