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

import {GeometryFactory} from 'tree_node/geometry_factory';
import {PropertyTreeNode} from 'tree_node/property_tree_node';

/**
 * Checks if the given property tree node represents an empty object.
 * @param obj The property tree node to check.
 * @return True if the object is considered empty, false otherwise.
 */
export function isEmptyObj(obj: PropertyTreeNode): boolean {
  if (isColor(obj)) {
    return isEmptyColor(obj);
  }

  if (isRect(obj)) {
    return GeometryFactory.makeRect(obj).isEmpty();
  }

  return false;
}

/**
 * Checks if the given property tree node represents a color.
 * @param obj The property tree node to check.
 * @return True if the object is a color, false otherwise.
 */
export function isColor(obj: PropertyTreeNode): boolean {
  return (
    (obj.getChildByName('r') !== undefined &&
      obj.getChildByName('g') !== undefined &&
      obj.getChildByName('b') !== undefined) ||
    obj.getChildByName('a') !== undefined
  );
}

/**
 * Checks if the given property tree node represents a rectangle.
 * @param obj The property tree node to check.
 * @return True if the object is a rectangle, false otherwise.
 */
export function isRect(obj: PropertyTreeNode): boolean {
  return (
    (obj.getChildByName('right') !== undefined &&
      obj.getChildByName('bottom') !== undefined) ||
    (obj.getChildByName('left') !== undefined &&
      obj.getChildByName('top') !== undefined)
  );
}

/**
 * Checks if the given property tree node represents a buffer.
 * @param obj The property tree node to check.
 * @return True if the object is a buffer, false otherwise.
 */
export function isBuffer(obj: PropertyTreeNode): boolean {
  return (
    obj.getChildByName('stride') !== undefined &&
    obj.getChildByName('format') !== undefined
  );
}

/**
 * Checks if the given property tree node represents a size.
 * @param obj The property tree node to check.
 * @return True if the object is a size, false otherwise.
 */
export function isSize(obj: PropertyTreeNode): boolean {
  return (
    obj.getAllChildren().length <= 2 &&
    (obj.getChildByName('w') !== undefined ||
      obj.getChildByName('h') !== undefined)
  );
}

/**
 * Checks if the given property tree node represents a position.
 * @param obj The property tree node to check.
 * @return True if the object is a position, false otherwise.
 */
export function isPosition(obj: PropertyTreeNode): boolean {
  return (
    obj.getAllChildren().length <= 2 &&
    (obj.getChildByName('x') !== undefined ||
      obj.getChildByName('y') !== undefined)
  );
}

/**
 * Checks if the given property tree node represents a region.
 * @param obj The property tree node to check.
 * @return True if the object is a region, false otherwise.
 */
export function isRegion(obj: PropertyTreeNode): boolean {
  const rect = obj.getChildByName('rect');
  return (
    rect !== undefined &&
    rect
      .getAllChildren()
      .every((innerRect: PropertyTreeNode) => isRect(innerRect))
  );
}

/**
 * Checks if the given property tree node represents a matrix.
 * @param obj The property tree node to check.
 * @return True if the object is a matrix, false otherwise.
 */
export function isMatrix(obj: PropertyTreeNode): boolean {
  return (
    !obj.getChildByName('type') &&
    (obj.getChildByName('dsdx') !== undefined ||
      obj.getChildByName('dtdx') !== undefined ||
      obj.getChildByName('dsdy') !== undefined ||
      obj.getChildByName('dtdy') !== undefined)
  );
}

function isEmptyColor(color: PropertyTreeNode): boolean {
  const [r, g, b, a] = [
    color.getChildByName('r')?.getValue() ?? 0,
    color.getChildByName('g')?.getValue() ?? 0,
    color.getChildByName('b')?.getValue() ?? 0,
    color.getChildByName('a')?.getValue() ?? 0,
  ];
  if (a === 0) return true;
  return r < 0 || g < 0 || b < 0;
}
