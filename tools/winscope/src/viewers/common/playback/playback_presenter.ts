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

import {HierarchyTreeNode} from 'tree_node/hierarchy_tree_node';
import {Trace} from 'trace_api/trace';
import {EmitEvent} from 'messaging/winscope_event_emitter';
import {TracePositionUpdate} from 'messaging/winscope_event';
import {TracePosition} from 'trace_api/trace_position';
import {TimeUtils} from 'common/time/time_utils';

export class PlaybackPresenter {
  constructor(private emitWinscopeEvent: EmitEvent) {}

  async playbackStart(trace: Trace<HierarchyTreeNode>) {
    const buffer = await this.buildBuffer(trace);
    let entryIndex = 0;
    while (entryIndex < buffer.length) {
      await this.emitWinscopeEvent(
        new TracePositionUpdate(
          TracePosition.fromTraceEntry(buffer[entryIndex]),
          true,
        ),
      );
      await TimeUtils.sleepMs(10);
      entryIndex = entryIndex + 1;
    }
  }

  private async buildBuffer(trace: Trace<HierarchyTreeNode>) {
    const length = trace.lengthEntries;
    const buffer = await trace.getRangeEntryValues({start: 0, end: length});
    return buffer;
  }
}
