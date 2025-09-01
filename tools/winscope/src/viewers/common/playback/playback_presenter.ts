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
import {Timer} from 'common/time/timer';
import {TraceEntryEager} from 'trace_api/trace';

export class PlaybackPresenter {
  private paused: boolean = true;
  private entryIndex: number = 0;
  private entryStepSize: number = 1;
  private buffer: Array<
    TraceEntryEager<HierarchyTreeNode, HierarchyTreeNode | undefined>
  > = [];
  private emitWinscopeEvent: EmitEvent;

  constructor(emitWinscopeEvent: EmitEvent) {
    this.emitWinscopeEvent = emitWinscopeEvent;
  }

  isPlaying() {
    return !this.paused;
  }

  async start(trace: Trace<HierarchyTreeNode>, currentPosition: number) {
    this.paused = false;
    await this.buildBuffer(trace);
    this.entryIndex = currentPosition;
    this.runPlaybackLoop();
  }

  async pause() {
    this.paused = true;
  }

  private async runPlaybackLoop() {
    while (this.entryIndex < this.buffer.length && !this.paused) {
      await this.emitWinscopeEvent(
        new TracePositionUpdate(
          TracePosition.fromTraceEntry(this.buffer[this.entryIndex]),
          true,
        ),
      );
      // we debounce the trace position updates to allow time for UI to render
      await new Timer(10, 10).sleepMs();
      this.entryIndex += this.entryStepSize;
    }
    this.paused = true;
  }

  private async buildBuffer(trace: Trace<HierarchyTreeNode>) {
    if (this.buffer.length === 0) {
      const length = trace.lengthEntries;
      this.buffer = await trace.getRangeEntryValues({start: 0, end: length});
    }
  }
}
