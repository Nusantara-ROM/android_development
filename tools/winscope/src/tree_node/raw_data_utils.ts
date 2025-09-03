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

import {makeRect} from './geometry_factory';
import {PropertyTreeNode} from './property_tree_node';

/**
 * Checks if a PropertyTreeNode represents an "empty" object.
 *
 * This function is useful for filtering out objects that, despite having some
 * structure, represent a null or empty state (e.g., a color with alpha 0,
 * or an empty rectangle).
 * @param obj The PropertyTreeNode to check.
 * @return True if the object is considered empty, false otherwise.
 */
export function isEmptyObj(obj: PropertyTreeNode): boolean {
  if (isColor(obj)) {
    return isEmptyColor(obj);
  }

  if (isRect(obj)) {
    return makeRect(obj).isEmpty();
  }

  return false;
}

/**
 * Checks if a PropertyTreeNode represents a color.
 *
 * This is useful for identifying color definitions within raw trace data,
 * allowing for special handling or visualization of color properties.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object contains color components (r, g, b, or a), false otherwise.
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
 * Checks if a PropertyTreeNode represents a rectangle.
 *
 * This helps in identifying geometric bounds within the trace data,
 * which can be used for layout or visual representation.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object has 'right'/'bottom' or 'left'/'top' children, false otherwise.
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
 * Checks if a PropertyTreeNode represents a buffer.
 *
 * This is useful for identifying properties related to graphical buffers,
 * such as stride and format.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object has 'stride' and 'format' children, false otherwise.
 */
export function isBuffer(obj: PropertyTreeNode): boolean {
  return (
    obj.getChildByName('stride') !== undefined &&
    obj.getChildByName('format') !== undefined
  );
}

/**
 * Checks if a PropertyTreeNode represents a size.
 *
 * This helps in extracting dimension information (width and height) from
 * the raw data.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object has 'w' or 'h' children and at most two children in total, false otherwise.
 */
export function isSize(obj: PropertyTreeNode): boolean {
  return (
    obj.getAllChildren().length <= 2 &&
    (obj.getChildByName('w') !== undefined ||
      obj.getChildByName('h') !== undefined)
  );
}

/**
 * Checks if a PropertyTreeNode represents a position.
 *
 * This is useful for extracting coordinate information (x and y) from
 * the raw data.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object has 'x' or 'y' children and at most two children in total, false otherwise.
 */
export function isPosition(obj: PropertyTreeNode): boolean {
  return (
    obj.getAllChildren().length <= 2 &&
    (obj.getChildByName('x') !== undefined ||
      obj.getChildByName('y') !== undefined)
  );
}

/**
 * Checks if a PropertyTreeNode represents a region.
 *
 * A region is defined as an object containing a 'rect' child, where all
 * children of 'rect' are themselves rectangles. This is useful for parsing
 * complex region definitions in trace data.
 * @param obj The PropertyTreeNode to check.
 * @return True if the object is a valid region, false otherwise.
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
 * Checks if a property tree node is a matrix.
 *
 * This function identifies objects that represent transformation matrices
 * by looking for common matrix components like 'dsdx', 'dtdx', etc.,
 * and ensuring no 'type' field is present.
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
