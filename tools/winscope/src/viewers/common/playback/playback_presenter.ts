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
  private isReverse: boolean = false;

  constructor(emitWinscopeEvent: EmitEvent) {
    this.emitWinscopeEvent = emitWinscopeEvent;
  }

  isPlaying() {
    return !this.paused;
  }

  async play(
    trace: Trace<HierarchyTreeNode>,
    currentPosition: number,
    isReverse: boolean,
  ) {
    this.paused = false;
    await this.buildBuffer(trace);
    this.entryIndex = currentPosition;
    this.isReverse = isReverse;
    if (this.isReverse && this.entryIndex === 0) {
      // if the user's cursor position is at 0 and they want to reverse play through the trace
      // change the index to the end of trace
      this.entryIndex = this.buffer.length - 1;
    }
    if (this.buffer.length > 0 && this.entryIndex < this.buffer.length) {
      this.runPlaybackLoop();
    }
  }

  async changeSpeed(speedValue: number) {
    this.entryStepSize = speedValue;
  }

  async pause() {
    this.paused = true;
  }

  private async runPlaybackLoop() {
    const lastIndex = this.buffer.length - 1;

    let nextIndex;
    let reachedEndOfTrace = false;

    while (!this.paused) {
      const currentIndex = this.entryIndex;
      await this.emitWinscopeEvent(
        new TracePositionUpdate(
          TracePosition.fromTraceEntry(this.buffer[currentIndex]),
          true,
        ),
      );
      // we debounce the trace position updates to allow time for UI to render
      await new Timer(10, 10).sleepMs();

      if (this.isReverse) {
        nextIndex = currentIndex - this.entryStepSize;
        if (nextIndex < 0) {
          reachedEndOfTrace = true;
          this.entryIndex = 0;
        } else {
          this.entryIndex = nextIndex;
        }
      } else {
        nextIndex = currentIndex + this.entryStepSize;
        if (nextIndex > lastIndex) {
          reachedEndOfTrace = true;
          this.entryIndex = lastIndex;
        } else {
          this.entryIndex = nextIndex;
        }
      }

      if (reachedEndOfTrace && this.entryIndex === currentIndex) {
        break;
      }
    }
    this.pause();
  }

  private async buildBuffer(trace: Trace<HierarchyTreeNode>) {
    if (this.buffer.length === 0) {
      const length = trace.lengthEntries;
      this.buffer = await trace.getRangeEntryValues({start: 0, end: length});
    }
  }
}
