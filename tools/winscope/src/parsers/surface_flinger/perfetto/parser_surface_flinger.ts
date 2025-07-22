/*
 * Copyright (C) 2023 The Android Open Source Project
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
  assertStringOrUndefined,
} from 'common/assert_utils';
import {AbstractParser} from 'parsers/perfetto/abstract_parser';
import {queryVsyncId} from 'parsers/perfetto/utils';
import {EntryHierarchyTreeFactory} from 'parsers/surface_flinger/entry_hierarchy_tree_factory';
import {
  CustomQueryParserResultTypeMap,
  CustomQueryType,
  VisitableParserCustomQuery,
} from 'trace/custom_query';
import {EntriesRange} from 'trace/trace';
import {TraceType} from 'trace/trace_type';
import {QueryResult} from 'trace_processor/query_result';
import {HierarchyTreeNode} from 'tree_node/hierarchy_tree_node';

export class ParserSurfaceFlinger extends AbstractParser<HierarchyTreeNode> {
  private readonly factory = new EntryHierarchyTreeFactory();

  override getTraceType(): TraceType {
    return TraceType.SURFACE_FLINGER;
  }

  override async getEntry(index: number): Promise<HierarchyTreeNode> {
    const snapshotId = this.entryIndexToRowIdMap[index];
    const snapshotResult = await this.querySnapshot(snapshotId);
    const layersResult = await this.queryLayers(snapshotId);
    return this.factory.makeEntryHierarchyTree(
      snapshotResult,
      layersResult,
      this.traceProcessor,
    );
  }

  override async customQuery<Q extends CustomQueryType>(
    type: Q,
    entriesRange: EntriesRange,
  ): Promise<CustomQueryParserResultTypeMap[Q]> {
    return new VisitableParserCustomQuery(type)
      .visit(CustomQueryType.VSYNCID, async () => {
        return queryVsyncId(
          this.traceProcessor,
          this.getTableName(),
          this.entryIndexToRowIdMap,
          entriesRange,
        );
      })
      .visit(CustomQueryType.SF_LAYERS_ID_AND_NAME, async () => {
        const sql = `
        SELECT DISTINCT layer_id, layer_name FROM surfaceflinger_layer;
      `;
        const queryResult = await this.traceProcessor.query(sql);
        const result: CustomQueryParserResultTypeMap[CustomQueryType.SF_LAYERS_ID_AND_NAME] =
          [];
        for (const it = queryResult.iter({}); it.valid(); it.next()) {
          const id = assertBigIntOrUndefined(it.get('layer_id') ?? undefined);
          const name = assertStringOrUndefined(
            it.get('layer_name') ?? undefined,
          );
          if (id !== undefined && name !== undefined) {
            result.push({id: Number(id), name});
          }
        }
        return result;
      })
      .getResult();
  }

  protected override getTableName(): string {
    return 'surfaceflinger_layers_snapshot';
  }

  protected override getStdLibModuleName(): string {
    return 'android.winscope.surfaceflinger';
  }

  private async querySnapshot(snapshotId: number): Promise<QueryResult> {
    const snapshotQuery = `
        SELECT
          sfs.arg_set_id,
          display.is_on,
          display.is_virtual,
          display.display_id,
          display.display_name,
          trace_rect.group_id,
          trace_rect.depth,
          trace_rect.x,
          trace_rect.y,
          trace_rect.w,
          trace_rect.h
        FROM surfaceflinger_layers_snapshot AS sfs
        LEFT JOIN android_surfaceflinger_display AS display
          ON sfs.id = display.snapshot_id
        LEFT JOIN winscope_rect AS trace_rect
          ON display.trace_rect_id = trace_rect.trace_rect_id
        WHERE sfs.id = ${snapshotId}
        ORDER BY display.id;`;
    return await this.traceProcessor.query(snapshotQuery);
  }

  private async queryLayers(snapshotId: number): Promise<QueryResult> {
    const layersQuery = `
        SELECT
          sfl.id,
          sfl.arg_set_id,
          sfl.layer_id,
          sfl.layer_name,
          sfl.is_visible,
          sfl.parent,
          sfl.corner_radius_tl,
          sfl.corner_radius_tr,
          sfl.corner_radius_bl,
          sfl.corner_radius_br,
          sfl.hwc_composition_type,
          sfl.is_hidden_by_policy,
          sfl.z_order_relative_of,
          sfl.is_missing_z_parent,
          sfl.input_rect_id,
          ltr.group_id,
          ltr.depth,
          ltr.opacity,
          ltr.x,
          ltr.y,
          ltr.w,
          ltr.h,
          lt.dsdx,
          lt.dtdx,
          lt.dsdy,
          lt.dtdy,
          lt.tx,
          lt.ty,
          itr.group_id AS input_group_id,
          itr.depth AS input_depth,
          itr.is_visible AS input_is_visible,
          itr.is_spy,
          itr.x AS input_x,
          itr.y AS input_y,
          itr.w AS input_w,
          itr.h AS input_h,
          frr.x AS fr_x,
          frr.y AS fr_y,
          frr.w AS fr_w,
          frr.h AS fr_h
        FROM surfaceflinger_layer AS sfl
        LEFT JOIN winscope_rect AS ltr
          ON sfl.layer_rect_id = ltr.trace_rect_id
        LEFT JOIN android_winscope_transform AS lt
          ON ltr.transform_id = lt.id
        LEFT JOIN winscope_rect AS itr
          ON sfl.input_rect_id = itr.trace_rect_id
        LEFT JOIN android_winscope_fill_region AS fr
          ON sfl.input_rect_id = fr.trace_rect_id
        LEFT JOIN android_winscope_rect AS frr
          ON fr.rect_id = frr.id
        WHERE sfl.snapshot_id = ${snapshotId};`;
    return await this.traceProcessor.query(layersQuery);
  }
}
