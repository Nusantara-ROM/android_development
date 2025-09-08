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

import {Rect} from 'common/geometry/rect';
import {TreeNode} from './tree_node';

/**
 * A node in a property tree.
 */
export class PropertyTreeNode extends TreeNode {
  protected formatter: PropertyFormatter | undefined = undefined;
  protected internalIsRoot = false;

  constructor(
    id: string,
    name: string,
    readonly source: PropertySource,
    protected readonly value: any,
  ) {
    super(id, name);
  }

  getValue(): any {
    return this.value;
  }

  setFormatter(formatter: PropertyFormatter): this {
    this.formatter = formatter;
    return this;
  }

  setIsRoot(value: boolean) {
    this.internalIsRoot = value;
  }

  override isRoot(): boolean {
    return this.internalIsRoot;
  }

  formattedValue(): string {
    if (this.formatter) {
      return this.formatter.format(this);
    }

    return '';
  }

  isEmptyObj(): boolean {
    if (this.isColor()) {
      return this.isEmptyColor();
    }

    if (this.isRect()) {
      const left = this.getChildByName('left')?.getValue() ?? 0;
      const top = this.getChildByName('top')?.getValue() ?? 0;
      const right = this.getChildByName('right')?.getValue() ?? 0;
      const bottom = this.getChildByName('bottom')?.getValue() ?? 0;
      const rect = new Rect(left, top, right - left, bottom - top);
      return rect.isEmpty();
    }

    return false;
  }

  isColor(): boolean {
    return (
      (this.getChildByName('r') !== undefined &&
        this.getChildByName('g') !== undefined &&
        this.getChildByName('b') !== undefined) ||
      this.getChildByName('a') !== undefined
    );
  }

  isRect(): boolean {
    return (
      (this.getChildByName('right') !== undefined &&
        this.getChildByName('bottom') !== undefined) ||
      (this.getChildByName('left') !== undefined &&
        this.getChildByName('top') !== undefined)
    );
  }

  isBuffer(): boolean {
    return (
      this.getChildByName('stride') !== undefined &&
      this.getChildByName('format') !== undefined
    );
  }

  isSize(): boolean {
    return (
      this.getAllChildren().length <= 2 &&
      (this.getChildByName('w') !== undefined ||
        this.getChildByName('h') !== undefined)
    );
  }

  isPosition(): boolean {
    return (
      this.getAllChildren().length <= 2 &&
      (this.getChildByName('x') !== undefined ||
        this.getChildByName('y') !== undefined)
    );
  }

  isRegion(): boolean {
    const rect = this.getChildByName('rect');
    return (
      rect !== undefined &&
      rect
        .getAllChildren()
        .every((innerRect: PropertyTreeNode) => innerRect.isRect())
    );
  }

  isMatrix(): boolean {
    return (
      !this.getChildByName('type') &&
      (this.getChildByName('dsdx') !== undefined ||
        this.getChildByName('dtdx') !== undefined ||
        this.getChildByName('dsdy') !== undefined ||
        this.getChildByName('dtdy') !== undefined)
    );
  }

  private isEmptyColor(): boolean {
    const [r, g, b, a] = [
      this.getChildByName('r')?.getValue() ?? 0,
      this.getChildByName('g')?.getValue() ?? 0,
      this.getChildByName('b')?.getValue() ?? 0,
      this.getChildByName('a')?.getValue() ?? 0,
    ];
    if (a === 0) return true;
    return r < 0 || g < 0 || b < 0;
  }
}

/**
 * The source of a property.
 */
export enum PropertySource {
  PROTO,
  DEFAULT,
  CALCULATED,
  TP,
}

/**
 * A formatter for a property tree node.
 */
export declare interface PropertyFormatter {
  format(node: PropertyTreeNode): string;
}
