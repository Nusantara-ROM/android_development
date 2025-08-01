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

import {UiTreeNodeUtils} from 'test/unit/ui_tree_node_utils';
import {TreeNode} from 'tree_node/tree_node';
import {AbstractAddDiffsTest} from './abstract_add_diffs_test';
import {AddDiffs} from './add_diffs';
import {AddDiffsPropertiesTree} from './add_diffs_properties_tree';
import {UiPropertyTreeNode} from './ui_property_tree_node';

class AddDiffsPropertiesTreeTest extends AbstractAddDiffsTest<UiPropertyTreeNode> {
  override makeAddDiffsOperation(): AddDiffs<UiPropertyTreeNode> {
    const isModified = async (
      newTree: TreeNode | undefined,
      oldTree: TreeNode | undefined,
    ) => {
      return (
        (newTree as UiPropertyTreeNode)?.getValue() !==
        (oldTree as UiPropertyTreeNode)?.getValue()
      );
    };
    return new AddDiffsPropertiesTree(isModified, []);
  }

  makeRoot(value = 'value'): UiPropertyTreeNode {
    const root = UiTreeNodeUtils.makeUiPropertyNode('test', 'root', value);
    root.setIsRoot(true);
    return root;
  }

  makeChildAndAddToRoot(
    rootNode: UiPropertyTreeNode,
    value = 'value',
    name = 'child',
  ): UiPropertyTreeNode {
    const child = UiTreeNodeUtils.makeUiPropertyNode('test node', name, value);
    rootNode.addOrReplaceChild(child);
    return child;
  }

  override executeSpecializedTests(): void {
    describe('Specialized tests', () => {
      let newRoot: UiPropertyTreeNode;
      let oldRoot: UiPropertyTreeNode;
      let expectedRoot: UiPropertyTreeNode;
      let addDiffs: AddDiffs<UiPropertyTreeNode>;

      beforeAll(() => {
        addDiffs = this.makeAddDiffsOperation();
      });

      beforeEach(() => {
        jasmine.addCustomEqualityTester(UiTreeNodeUtils.treeNodeEqualityTester);
        newRoot = this.makeRoot();
        oldRoot = this.makeRoot();
        expectedRoot = this.makeRoot();
      });

      it('does not add MODIFIED to property tree root', async () => {
        oldRoot = this.makeRoot('oldValue');
        await addDiffs.executeInPlace(newRoot, oldRoot);
        expect(newRoot).toEqual(expectedRoot);
      });

      it('does not add any diffs to property tree that has no old tree', async () => {
        await addDiffs.executeInPlace(newRoot, undefined);
        expect(newRoot).toEqual(expectedRoot);
      });
    });
  }
}

describe('AddDiffsPropertiesTree', () => {
  new AddDiffsPropertiesTreeTest().execute();
});
