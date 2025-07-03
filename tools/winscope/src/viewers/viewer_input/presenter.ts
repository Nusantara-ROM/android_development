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

import {assertBigInt, assertDefined} from 'common/assert_utils';
import {PersistentStoreProxy} from 'common/store/persistent_store_proxy';
import {Store} from 'common/store/store';
import {Analytics} from 'logging/analytics';
import {TabbedViewSwitchRequest} from 'messaging/winscope_event';
import {CustomQueryType} from 'trace/custom_query';
import {InputColumnType} from 'trace/input/input_column_type';
import {InputEventType} from 'trace/input/input_event_type';
import {Trace, TraceEntry, TraceEntryLazy} from 'trace/trace';
import {Traces} from 'trace/traces';
import {TRACE_INFO} from 'trace/trace_info';
import {TraceType} from 'trace/trace_type';
import {HierarchyTreeNode} from 'trace/tree_node/hierarchy_tree_node';
import {PropertyTreeNode} from 'trace/tree_node/property_tree_node';
import {
  AbstractLogViewerPresenter,
  NotifyLogViewCallbackType,
} from 'viewers/common/abstract_log_viewer_presenter';
import {VISIBLE_CHIP} from 'viewers/common/chip';
import {LogSelectFilter} from 'viewers/common/log_filters';
import {LogPresenter} from 'viewers/common/log_presenter';
import {PropertiesPresenter} from 'viewers/common/properties_presenter';
import {RectsPresenter} from 'viewers/common/rects_presenter';
import {TextFilter} from 'viewers/common/text_filter';
import {ColumnSpec, LogEntry, LogHeader} from 'viewers/common/ui_data_log';
import {UI_RECT_FACTORY} from 'viewers/common/ui_rect_factory';
import {UserOptions} from 'viewers/common/user_options';
import {ViewerEvents} from 'viewers/common/viewer_events';
import {
  RectLegendFactory,
  TraceRectType,
} from 'viewers/components/rects/rect_spec';
import {
  convertRectIdToLayerorDisplayName,
  makeDisplayIdentifiers,
} from 'viewers/viewer_surface_flinger/presenter';
import {FormatDispatchEntry} from './operations/format_dispatch_entry';
import {InputEntry, UiData} from './ui_data';

export class Presenter extends AbstractLogViewerPresenter<
  UiData,
  HierarchyTreeNode
> {
  private static readonly COLUMNS = {
    type: {
      name: 'Type',
      cssClass: 'input-type inline',
      columnType: InputColumnType.EVENT_TYPE,
    },
    source: {
      name: 'Source',
      cssClass: 'input-source',
      columnType: InputColumnType.SOURCE,
    },
    action: {
      name: 'Action',
      cssClass: 'input-action',
      columnType: InputColumnType.ACTION,
    },
    deviceId: {
      name: 'Device',
      cssClass: 'input-device-id right-align',
      columnType: InputColumnType.DEVICE_ID,
    },
    displayId: {
      name: 'Display',
      cssClass: 'input-display-id right-align',
      columnType: InputColumnType.DISPLAY_ID,
    },
    details: {
      name: 'Details',
      cssClass: 'input-details',
    },
    dispatchWindows: {
      name: 'Target Windows',
      cssClass: 'input-windows',
      columnType: InputColumnType.WINDOWS,
    },
  };
  private static readonly DENYLIST_DISPATCH_PROPERTIES = ['eventId'];

  private readonly traces: Traces;
  private readonly surfaceFlingerTrace: Trace<HierarchyTreeNode> | undefined;

  private readonly layerIdToName = new Map<number, string>();
  private readonly allInputLayerIds = new Set<number>();

  protected override logPresenter = new LogPresenter<InputEntry>();
  protected override propertiesPresenter = new PropertiesPresenter(
    {},
    new TextFilter(),
    [],
  );
  protected dispatchPropertiesPresenter = new PropertiesPresenter(
    {},
    new TextFilter(),
    Presenter.DENYLIST_DISPATCH_PROPERTIES,
    [new FormatDispatchEntry(this.layerIdToName)],
  );
  protected override keepCalculated = true;
  private readonly currentTargetWindowIds = new Set<string>();
  private currDispatchProperties: PropertyTreeNode | undefined;

  private readonly rectsPresenter = new RectsPresenter(
    PersistentStoreProxy.new<UserOptions>(
      'InputWindowRectsOptions',
      {
        showOnlyWithContent: {
          name: 'Has input',
          icon: 'pan_tool_alt',
          enabled: false,
        },
        showOnlyVisible: {
          name: 'Show only',
          chip: VISIBLE_CHIP,
          enabled: true,
        },
      },
      this.storage,
    ),
    (tree: HierarchyTreeNode) => {
      return UI_RECT_FACTORY.makeInputRects(
        tree,
        (id) => this.currentTargetWindowIds.has(id.split(' ')[0]),
        this.currDispatchProperties,
      );
    },
    makeDisplayIdentifiers,
    convertRectIdToLayerorDisplayName,
  );

  constructor(
    traces: Traces,
    mergedInputEventTrace: Trace<HierarchyTreeNode>,
    private readonly storage: Store,
    readonly notifyInputViewCallback: NotifyLogViewCallbackType<UiData>,
  ) {
    const uiData = UiData.createEmpty();
    uiData.isDarkMode = storage.get('dark-mode') === 'true';
    uiData.rectSpec = {
      type: TraceRectType.INPUT_WINDOWS,
      icon: TRACE_INFO[TraceType.INPUT_EVENT_MERGED].icon,
      legend: RectLegendFactory.makeLegendForInputWindowRects(false),
    };
    super(
      mergedInputEventTrace,
      (uiData) => notifyInputViewCallback(uiData as UiData),
      uiData,
    );
    this.traces = traces;
    this.surfaceFlingerTrace = this.traces.getTrace(TraceType.SURFACE_FLINGER);
  }

  async onDispatchPropertiesFilterChange(textFilter: TextFilter) {
    this.dispatchPropertiesPresenter.applyPropertiesFilterChange(textFilter);
    await this.updateDispatchPropertiesTree();
    this.uiData.dispatchPropertiesFilter = textFilter;
    this.notifyViewChanged();
  }

  onHighlightedPropertyChange(id: string) {
    this.propertiesPresenter.applyHighlightedPropertyChange(id);
    this.dispatchPropertiesPresenter.applyHighlightedPropertyChange(id);
    this.uiData.highlightedProperty =
      id === this.uiData.highlightedProperty ? '' : id;
    this.notifyViewChanged();
  }

  async onHighlightedIdChange(id: string) {
    this.uiData.highlightedRect = id === this.uiData.highlightedRect ? '' : id;
    await this.updateRects();
    this.notifyViewChanged();
  }

  async onRectsUserOptionsChange(userOptions: UserOptions) {
    this.rectsPresenter.applyRectsUserOptionsChange(userOptions);
    await this.updateRects();
    this.notifyViewChanged();
  }

  async onRectDoubleClick() {
    await this.emitAppEvent(
      new TabbedViewSwitchRequest(assertDefined(this.surfaceFlingerTrace)),
    );
  }

  protected override async initializeTraceSpecificData() {
    if (this.surfaceFlingerTrace !== undefined) {
      const layerMappings = await this.surfaceFlingerTrace.customQuery(
        CustomQueryType.SF_LAYERS_ID_AND_NAME,
      );
      layerMappings.forEach(({id, name}) => this.layerIdToName.set(id, name));
    }
  }

  protected override makeHeaders(): LogHeader[] {
    return [
      new LogHeader(
        Presenter.COLUMNS.type,
        new LogSelectFilter([], false, '80'),
      ),
      new LogHeader(
        Presenter.COLUMNS.source,
        new LogSelectFilter([], false, '200'),
      ),
      new LogHeader(
        Presenter.COLUMNS.action,
        new LogSelectFilter([], false, '100'),
      ),
      new LogHeader(
        Presenter.COLUMNS.deviceId,
        new LogSelectFilter([], false, '80'),
      ),
      new LogHeader(
        Presenter.COLUMNS.displayId,
        new LogSelectFilter([], false, '80'),
      ),
      new LogHeader(Presenter.COLUMNS.details),
      new LogHeader(
        Presenter.COLUMNS.dispatchWindows,
        new LogSelectFilter([], true, '300'),
      ),
    ];
  }

  protected override async updateFiltersInHeaders(
    headers: LogHeader[],
    entries: LogEntry[],
  ) {
    const uniqueFieldValues = Presenter.getUniqueFieldValues(headers, entries);
    headers.forEach((header) => {
      if (!(header.filter instanceof LogSelectFilter)) {
        return;
      }
      if (header.spec === Presenter.COLUMNS.dispatchWindows) {
        header.filter.options = [...this.allInputLayerIds.values()].map(
          (layerId) => {
            return this.getLayerDisplayName(layerId);
          },
        );
        return;
      }
      header.filter.options = Array.from(
        assertDefined(uniqueFieldValues.get(header.spec)),
      );
      header.filter.options.sort();
    });
  }

  protected override async makeUiDataEntries(): Promise<InputEntry[]> {
    const entries: InputEntry[] = [];
    const trees = await this.trace.getAllEntryValues();
    for (let i = 0; i < trees.length; i++) {
      const wrapperTree = trees[i];
      if (wrapperTree === undefined) {
        continue;
      }
      const traceEntry = assertDefined(this.trace.getEntry(i));
      const entry = this.makeInputEntry(traceEntry, wrapperTree);
      entries.push(entry);
    }
    return entries;
  }

  protected override async updatePropertiesTree() {
    await super.updatePropertiesTree();
    await this.updateDispatchPropertiesTree();
    await this.updateRects();
  }

  protected override addViewerSpecificListeners(htmlElement: HTMLElement) {
    htmlElement.addEventListener(
      ViewerEvents.HighlightedPropertyChange,
      (event) =>
        this.onHighlightedPropertyChange((event as CustomEvent).detail.id),
    );

    htmlElement.addEventListener(ViewerEvents.HighlightedIdChange, (event) =>
      this.onHighlightedIdChange((event as CustomEvent).detail.id),
    );

    htmlElement.addEventListener(
      ViewerEvents.RectsUserOptionsChange,
      async (event) => {
        await this.onRectsUserOptionsChange(
          (event as CustomEvent).detail.userOptions,
        );
      },
    );

    htmlElement.addEventListener(ViewerEvents.RectsDblClick, async (event) => {
      await this.onRectDoubleClick();
    });

    htmlElement.addEventListener(
      ViewerEvents.DispatchPropertiesFilterChange,
      async (event) => {
        const detail: TextFilter = (event as CustomEvent).detail;
        await this.onDispatchPropertiesFilterChange(detail);
      },
    );
  }

  private async updateDispatchPropertiesTree() {
    const inputEntry = this.getCurrentEntry();
    const tree = inputEntry?.getDispatchPropertiesTree
      ? await inputEntry.getDispatchPropertiesTree()
      : undefined;
    this.dispatchPropertiesPresenter.setPropertiesTree(tree);
    await this.dispatchPropertiesPresenter.formatPropertiesTree(
      undefined,
      undefined,
      this.keepCalculated ?? false,
      this.trace.type,
    );
    this.uiData.dispatchPropertiesTree =
      this.dispatchPropertiesPresenter.getFormattedTree();
  }

  private makeInputEntry(
    traceEntry: TraceEntryLazy<HierarchyTreeNode>,
    wrapperTree: HierarchyTreeNode,
  ): InputEntry {
    const type = assertDefined(wrapperTree.getEagerPropertyByName('type'));

    const getPropertiesTree = async () => {
      const properties = await wrapperTree.getAllProperties();
      const event = assertDefined(properties.getChildByName('event'));
      event.setIsRoot(true);
      return event;
    };
    const getDispatchPropertiesTree = async () => {
      const properties = await wrapperTree.getAllProperties();
      const dispatchTree = assertDefined(
        properties.getChildByName('dispatchEvents'),
      );
      dispatchTree.setIsRoot(true);
      return dispatchTree;
    };

    const windows = assertDefined(wrapperTree.getEagerPropertyByName('windows'))
      .getAllChildren()
      .map((window) => {
        const windowId = Number(window?.getValue() ?? -1);
        this.allInputLayerIds.add(windowId);
        return windowId;
      });

    let sfEntry: TraceEntry<HierarchyTreeNode> | undefined;
    if (this.surfaceFlingerTrace !== undefined && this.trace.hasFrameInfo()) {
      const frame = traceEntry.getFramesRange()?.start;
      if (frame !== undefined) {
        const sfFrame = this.surfaceFlingerTrace.getFrame(frame);
        if (sfFrame.lengthEntries > 0) {
          sfEntry = sfFrame.getEntry(0);
        }
      }
    }

    return new InputEntry(
      traceEntry,
      [
        {
          spec: Presenter.COLUMNS.type,
          value: type.formattedValue(),
          propagateEntryTimestamp: true,
        },
        {
          spec: Presenter.COLUMNS.source,
          value: assertDefined(wrapperTree.getEagerPropertyByName('source'))
            .formattedValue()
            .replace('SOURCE_', ''),
        },
        {
          spec: Presenter.COLUMNS.action,
          value: Presenter.getInputAction(wrapperTree),
        },
        {
          spec: Presenter.COLUMNS.deviceId,
          value: Number(
            assertBigInt(
              wrapperTree.getEagerPropertyByName('deviceId')?.getValue(),
            ),
          ),
        },
        {
          spec: Presenter.COLUMNS.displayId,
          value: Number(
            assertBigInt(
              wrapperTree.getEagerPropertyByName('displayId')?.getValue(),
            ),
          ),
        },
        {
          spec: Presenter.COLUMNS.details,
          value:
            type.getValue() === InputEventType.KEY
              ? Presenter.extractKeyDetails(wrapperTree)
              : Presenter.extractDispatchDetails(wrapperTree),
        },
        {
          spec: Presenter.COLUMNS.dispatchWindows,
          value: windows
            ?.map((window) => {
              return this.getLayerDisplayName(window);
            })
            .join(', '),
        },
      ],
      getPropertiesTree,
      getDispatchPropertiesTree,
      sfEntry,
    );
  }

  private getLayerDisplayName(layerId: number): string {
    // Surround the name using the invisible zero-width non-joiner character to ensure
    // the full string is matched while filtering.
    return `\u{200C}${
      this.layerIdToName.get(layerId) ?? layerId.toString()
    }\u{200C}`;
  }

  private async updateRects() {
    if (this.surfaceFlingerTrace === undefined) {
      return;
    }
    const inputEntry = this.getCurrentEntry();

    this.currentTargetWindowIds.clear();
    this.currDispatchProperties = undefined;

    const dispatchProperties = await inputEntry?.getDispatchPropertiesTree?.();
    if (dispatchProperties) {
      dispatchProperties.getAllChildren()?.forEach((dispatchEntry) => {
        const windowId = dispatchEntry.getChildByName('windowId');
        if (windowId !== undefined) {
          this.currentTargetWindowIds.add(`${Number(windowId.getValue())}`);
        }
      });
    }

    if (inputEntry?.surfaceFlingerEntry !== undefined) {
      const startTimeMs = Date.now();
      const node = await inputEntry.surfaceFlingerEntry.getValue();
      this.currDispatchProperties = dispatchProperties;
      this.rectsPresenter.applyHierarchyTreesChange([
        {trace: this.surfaceFlingerTrace, trees: [node]},
      ]);
      Analytics.Navigation.logFetchComponentDataTime(
        'rects',
        TRACE_INFO[TraceType.INPUT_EVENT_MERGED].name,
        false,
        Date.now() - startTimeMs,
      );

      this.uiData.rectsToDraw = this.rectsPresenter.getRectsToDraw();
      this.uiData.rectIdToShowState =
        this.rectsPresenter.getRectIdToShowState();
    } else {
      this.uiData.rectsToDraw = [];
      this.uiData.rectIdToShowState = undefined;
    }
    this.uiData.rectsUserOptions = this.rectsPresenter.getUserOptions();
    this.uiData.displays = this.rectsPresenter.getDisplays();
  }

  private getCurrentEntry(): InputEntry | undefined {
    const entries = this.logPresenter.getFilteredEntries();
    const selectedIndex = this.logPresenter.getSelectedIndex();
    const currentIndex = this.logPresenter.getCurrentIndex();
    const index = selectedIndex ?? currentIndex;
    if (index === undefined) {
      return undefined;
    }
    return entries[index];
  }

  private static getInputAction(tree: HierarchyTreeNode): string {
    const actionNode = assertDefined(tree.getEagerPropertyByName('action'));
    const action = Number(actionNode.getValue());
    const actionMasked = action & 0xff;
    const pointerIndex = action >> 8;
    switch (actionMasked) {
      case 5:
        return `POINTER_DOWN(${pointerIndex})`;
      case 6:
        return `POINTER_UP(${pointerIndex})`;
      default:
        return actionNode.formattedValue().replace('ACTION_', '');
    }
  }

  private static extractKeyDetails(wrapperTree: HierarchyTreeNode): string {
    const keyDetails =
      'Keycode: ' +
      (wrapperTree
        .getEagerPropertyByName('keyCode')
        ?.formattedValue()
        ?.replace(/^KEYCODE_/, '') ?? '<?>');
    return keyDetails + ' ' + Presenter.extractDispatchDetails(wrapperTree);
  }

  private static extractDispatchDetails(
    wrapperTree: HierarchyTreeNode,
  ): string {
    let details = '';
    wrapperTree
      .getEagerPropertyByName('windows')
      ?.getAllChildren()
      .forEach((window) => {
        if (window.formattedValue() === '0') {
          // Skip showing windowId 0, which is an omnipresent system window.
          return;
        }
        details += window.getValue() + ', ';
      });
    return '[' + details.slice(0, -2) + ']';
  }

  private static getUniqueFieldValues(
    headers: LogHeader[],
    entries: LogEntry[],
  ): Map<ColumnSpec, Set<string>> {
    const uniqueFieldValues = new Map<ColumnSpec, Set<string>>();
    headers.forEach((header) => {
      if (!header.filter || header.spec === Presenter.COLUMNS.dispatchWindows) {
        return;
      }
      uniqueFieldValues.set(header.spec, new Set());
    });
    entries.forEach((entry) => {
      entry.fields.forEach((field) => {
        uniqueFieldValues.get(field.spec)?.add(field.value.toString());
      });
    });
    return uniqueFieldValues;
  }
}
