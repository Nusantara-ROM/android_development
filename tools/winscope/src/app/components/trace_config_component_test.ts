/*
 * Copyright (C) 2022 The Android Open Source Project
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
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDividerModule} from '@angular/material/divider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {assertDefined} from 'common/assert_utils';
import {InMemoryStorage} from 'common/store/in_memory_storage';
import {Store} from 'common/store/store';
import {checkTooltips, DOMTestHelper} from 'test/unit/dom_test_utils';
import {TraceType} from 'trace/trace_type';
import {ConfigurationOptions} from 'trace_collection/ui/ui_trace_configuration';
import {TraceConfigComponent} from './trace_config_component';

describe('TraceConfigComponent', () => {
  const storeKey = 'TestConfigSettings';
  let component: TraceConfigComponent;
  let dom: DOMTestHelper<TraceConfigComponent>;
  let configChangeSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        MatCheckboxModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatTooltipModule,
        MatButtonModule,
      ],
      declarations: [TraceConfigComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(TraceConfigComponent);
    component = fixture.componentInstance;
    dom = new DOMTestHelper(fixture, fixture.nativeElement);
    configChangeSpy = spyOn(component.traceConfigChange, 'emit');
    await setComponentInputs(component);
  });

  it('can be created', () => {
    expect(component).toBeTruthy();
  });

  it('displays config alphabetically by name', () => {
    expect(dom.findAll('.trace-checkbox').map((box) => box.getText())).toEqual([
      'disabled_checkbox_trace',
      'layers_trace',
      'multiple_selection_trace',
      'optional_multiple_selection_trace',
      'optional_selection_trace',
      'unavailable_trace',
      'window_trace',
    ]);
  });

  it('displays advanced config alphabetically by name', () => {
    expect(dom.findAll('.config-heading').map((box) => box.getText())).toEqual([
      'disabled_checkbox_trace configuration',
      'layers_trace configuration',
      'multiple_selection_trace configuration',
      'optional_multiple_selection_trace configuration',
      'optional_selection_trace configuration',
      'window_trace configuration',
    ]);
  });

  it('applies stored config and emits event on init', async () => {
    getCheckboxConfigSectionForKey('layers_trace').findAndClick('input');
    expect(
      assertDefined(component.traceConfig)['layers_trace'].config
        .checkboxConfigs,
    ).toEqual([{name: 'trace buffers', key: 'tracebuffers', enabled: false}]);

    // remove window_trace checkbox configs from storage
    const commonStorage = new InMemoryStorage();
    commonStorage.add(
      storeKey + 'layers_trace',
      assertDefined(component.storage?.get(storeKey + 'layers_trace')),
    );
    const wmConfig: ConfigurationOptions = JSON.parse(
      assertDefined(component.storage?.get(storeKey + 'window_trace')),
    );
    wmConfig.checkboxConfigs = [];
    commonStorage.add(storeKey + 'window_trace', JSON.stringify(wmConfig));

    const newFixture = TestBed.createComponent(TraceConfigComponent);
    const newComponent = newFixture.componentInstance;
    const newDom = new DOMTestHelper(newFixture, newFixture.nativeElement);
    const spy = spyOn(newComponent.traceConfigChange, 'emit');
    await setComponentInputs(newComponent, newDom, commonStorage);
    expect(spy).toHaveBeenCalledTimes(1);

    const newConfig = assertDefined(newComponent.traceConfig);
    // layers_trace tracebuffers set to false from storage
    expect(newConfig['layers_trace'].config.checkboxConfigs).toEqual([
      {name: 'trace buffers', key: 'tracebuffers', enabled: false},
    ]);
    // window_trace checkbox configs retained during merge even though they are no longer in storage
    expect(newConfig['window_trace'].config.checkboxConfigs).toEqual([
      {name: 'extra', key: 'extra', enabled: true},
    ]);
  });

  it('handles proxy object for initial trace config', async () => {
    const newFixture = TestBed.createComponent(TraceConfigComponent);
    const newComponent = newFixture.componentInstance;
    const newDom = new DOMTestHelper(newFixture, newFixture.nativeElement);
    const spy = spyOn(newComponent.traceConfigChange, 'emit');

    newComponent.title = 'Targets';
    newComponent.traceConfig = component.traceConfig;
    newComponent.traceConfigStoreKey = 'TestConfigSettings';
    newComponent.storage = component.storage;
    await detectNgModelChanges(newDom);
    newDom.detectChanges();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('trace checkbox enabled by default', () => {
    const traceKey = 'layers_trace';
    configChangeSpy.calls.reset();
    const config = assertDefined(component.traceConfig);

    const box = getTraceBoxForKey('layers_trace');
    const input = box.get('input');
    const inputElement = input.getHTMLElement<HTMLInputElement>();

    box.checkText(traceKey);
    expect(inputElement.checked).toBeTrue();
    expect(inputElement.ariaChecked).toEqual('true');
    expect(config[traceKey].config.enabled).toBeTrue();

    input.click();
    expect(inputElement.checked).toBeFalse();
    expect(inputElement.ariaChecked).toEqual('false');
    expect(config[traceKey].config.enabled).toBeFalse();
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('trace checkbox not enabled by default', () => {
    const traceKey = 'window_trace';
    configChangeSpy.calls.reset();
    const config = assertDefined(component.traceConfig);

    const box = getTraceBoxForKey(traceKey);
    const input = box.get('input');
    const inputElement = input.getHTMLElement<HTMLInputElement>();

    box.checkText(traceKey);
    expect(inputElement.checked).toBeFalse();
    expect(inputElement.ariaChecked).toEqual('false');
    expect(config[traceKey].config.enabled).toBeFalse();

    input.click();
    expect(inputElement.checked).toBeTrue();
    expect(inputElement.ariaChecked).toEqual('true');
    expect(config[traceKey].config.enabled).toBeTrue();
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('disables config section if trace not enabled', () => {
    const configSection = getConfigSectionForKey('window_trace');
    configSection.checkClassName('disabled-component');
  });

  it('disables checkbox for unavailable trace', () => {
    const traceKey = 'unavailable_trace';
    const box = getTraceBoxForKey(traceKey);
    box.get('input').checkDisabled(true);
    box.checkText(traceKey);
  });

  it('disables checkbox for disabled checkbox config', () => {
    const traceKey = 'disabled_checkbox_trace';
    const box = getTraceBoxForKey(traceKey);
    box.get('input').checkDisabled(true);
    box.checkText(traceKey);
  });

  it('checkbox and select configs show', () => {
    const checkboxConfigSection =
      getCheckboxConfigSectionForKey('layers_trace');
    checkboxConfigSection.checkInnerHTML('trace buffers');
    checkboxConfigSection.checkInnerHTML('tracing level', false);

    const selectionConfigSection = dom.get('.selection-config-opt');
    selectionConfigSection.checkInnerHTML('trace buffers', false);
    selectionConfigSection.checkInnerHTML('tracing level');
  });

  it('changing checkbox config model value causes box to change', async () => {
    const inputElement = getCheckboxConfigSectionForKey('layers_trace')
      .get('input')
      .getHTMLElement<HTMLInputElement>();
    assertDefined(
      assertDefined(component.traceConfig)['layers_trace'].config,
    ).checkboxConfigs[0].enabled = false;
    await detectNgModelChanges();
    expect(inputElement.checked).toBeFalse();
    expect(inputElement.ariaChecked).toEqual('false');

    assertDefined(
      assertDefined(component.traceConfig)['layers_trace'].config,
    ).checkboxConfigs[0].enabled = true;
    await detectNgModelChanges();
    expect(inputElement.checked).toBeTrue();
    expect(inputElement.ariaChecked).toEqual('true');
  });

  it('changing checkbox config by DOM interaction emits event', async () => {
    configChangeSpy.calls.reset();
    getTraceBoxForKey('layers_trace').findAndClick('input');
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('changing selected config causes select to change', async () => {
    configChangeSpy.calls.reset();
    await dom.openMatSelect();
    const panel = dom.getMatSelectPanel();
    dom.clickMatOption();
    expect(panel.find('.user-option')).toBeUndefined();
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('clicking None button clears optional single selection config value', async () => {
    configChangeSpy.calls.reset();
    await dom.openMatSelect(
      getIndexForSectionWithSelectConfigs('optional_selection_trace'),
    );

    dom.clickMatOption();
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
    expect(
      configChangeSpy.calls.mostRecent().args[0]['optional_selection_trace']
        .config.selectionConfigs[0].value,
    ).toEqual('12345');

    const panel = dom.getMatSelectPanel();
    panel.findAndClick('.user-option');
    expect(configChangeSpy).toHaveBeenCalledTimes(2);
    expect(
      configChangeSpy.calls.mostRecent().args[0]['optional_selection_trace']
        .config.selectionConfigs[0].value,
    ).toEqual('');
  });

  it('clicking All button selects or clears all options for multiple selection config', async () => {
    configChangeSpy.calls.reset();
    await dom.openMatSelect(
      getIndexForSectionWithSelectConfigs('multiple_selection_trace'),
    );

    const panel = dom.getMatSelectPanel();
    const allButton = panel.findAndClick('.user-option');
    expect(configChangeSpy).toHaveBeenCalledTimes(1);
    expect(
      configChangeSpy.calls.mostRecent().args[0]['multiple_selection_trace']
        .config.selectionConfigs[0].value,
    ).toEqual(['12345', '67890']);

    allButton.click();
    expect(configChangeSpy).toHaveBeenCalledTimes(2);
    expect(
      configChangeSpy.calls.mostRecent().args[0]['multiple_selection_trace']
        .config.selectionConfigs[0].value,
    ).toEqual([]);
  });

  it('stabilizes tooltip position', async () => {
    await dom.openMatSelect(
      getIndexForSectionWithSelectConfigs('optional_selection_trace'),
    );

    const panel = dom.getMatSelectPanel();
    const options = panel.findAll('mat-option');

    const shortOption = options[0];
    checkTooltips([shortOption], [undefined]);

    const longOption = options[1];
    longOption.dispatchEvent(new Event('mouseenter'));
    const tooltipPanel = dom.findMatTooltipPanel()?.getHTMLElement();
    expect(tooltipPanel?.style.top.length).toBeGreaterThan(0);
    expect(tooltipPanel?.style.left.length).toBeGreaterThan(0);
  });

  it('disables selection field if no options', async () => {
    assertDefined(
      component.traceConfig?.['optional_selection_trace'].config,
    ).selectionConfigs[0].options = [];
    await detectNgModelChanges();

    const index = getIndexForSectionWithSelectConfigs(
      'optional_selection_trace',
    );
    await dom.openMatSelect(index);
    expect(dom.isMatSelectOpen()).toBeFalse();
  });

 it('shows config desc', () => {
    const configDescs = dom.findAll('.config-desc');
    expect(configDescs[0].getText()).toEqual('Layers trace config description');
    expect(configDescs.length).toEqual(1);
  });

  async function setComponentInputs(
    c: TraceConfigComponent,
    d: DOMTestHelper<TraceConfigComponent> = dom,
    storage: Store = new InMemoryStorage(),
  ) {
    c.title = 'Targets';
    c.traceConfig = {
      layers_trace: {
        name: 'layers_trace',
        available: true,
        types: [TraceType.SURFACE_FLINGER],
        config: {
          enabled: true,
          checkboxConfigs: [
            {
              name: 'trace buffers',
              key: 'tracebuffers',
              enabled: true,
            },
          ],
          selectionConfigs: [
            {
              key: 'tracinglevel',
              name: 'tracing level',
              options: ['verbose', 'debug', 'critical'],
              value: 'debug',
            },
          ],
          desc: 'Layers trace config description'
        },
      },
      window_trace: {
        name: 'window_trace',
        available: true,
        types: [TraceType.WINDOW_MANAGER],
        config: {
          enabled: false,
          checkboxConfigs: [
            {
              name: 'extra',
              key: 'extra',
              enabled: true,
            },
          ],
          selectionConfigs: [],
        },
      },
      unavailable_trace: {
        name: 'unavailable_trace',
        available: false,
        types: [TraceType.TEST_TRACE_STRING],
        config: {
          enabled: false,
          checkboxConfigs: [],
          selectionConfigs: [],
        },
      },
      disabled_checkbox_trace: {
        name: 'disabled_checkbox_trace',
        available: true,
        types: [TraceType.TEST_TRACE_STRING],
        config: {
          enabled: true,
          checkboxConfigs: [
            {
              name: 'extra',
              key: 'extra',
              enabled: true,
              disabled: true,
            },
          ],
          selectionConfigs: [],
        },
      },
      optional_selection_trace: {
        name: 'optional_selection_trace',
        available: true,
        types: [TraceType.TEST_TRACE_STRING],
        config: {
          enabled: true,
          checkboxConfigs: [],
          selectionConfigs: [
            {
              key: 'displays',
              name: 'displays',
              options: ['12345', 'long_option'.repeat(100)],
              value: '',
              optional: true,
            },
          ],
        },
      },
      multiple_selection_trace: {
        name: 'multiple_selection_trace',
        available: true,
        types: [TraceType.TEST_TRACE_STRING],
        config: {
          enabled: true,
          checkboxConfigs: [],
          selectionConfigs: [
            {
              key: 'displays',
              name: 'displays',
              options: ['12345', '67890'],
              value: [],
            },
          ],
        },
      },
      optional_multiple_selection_trace: {
        name: 'optional_multiple_selection_trace',
        available: true,
        types: [TraceType.TEST_TRACE_STRING],
        config: {
          enabled: true,
          checkboxConfigs: [],
          selectionConfigs: [
            {
              key: 'displays',
              name: 'displays',
              options: ['12345', '67890'],
              value: [],
              optional: true,
            },
          ],
        },
      },
    };
    c.traceConfigStoreKey = storeKey;
    c.storage = storage;
    await detectNgModelChanges(d);
    d.detectChanges();
  }

  async function detectNgModelChanges(
    d: DOMTestHelper<TraceConfigComponent> = dom,
  ) {
    await d.detectChangesAndWaitStable();
    d.detectChanges();
  }

  function getTraceBoxForKey(
    traceKey: string,
  ): DOMTestHelper<TraceConfigComponent> {
    const index = component
      .getSortedTraceKeys()
      .findIndex((key) => key === traceKey);
    return dom.findAll('.trace-checkbox')[index];
  }

  function getConfigSectionForKey(
    traceKey: string,
  ): DOMTestHelper<TraceConfigComponent> {
    const index = component
      .getSortedConfigKeys()
      .findIndex((key) => key === traceKey);
    return dom.findAll('.config-section')[index];
  }

  function getCheckboxConfigSectionForKey(
    configKey: string,
  ): DOMTestHelper<TraceConfigComponent> {
    const index = component
      .getSortedConfigKeys()
      .filter(
        (key) =>
          assertDefined(component.traceConfig)[key].config.checkboxConfigs
            .length > 0,
      )
      .findIndex((key) => key === configKey);

    return dom.findAll('.enable-config-opt')[index];
  }

  function getIndexForSectionWithSelectConfigs(configKey: string): number {
    return component
      .getSortedConfigKeys()
      .filter(
        (key) =>
          assertDefined(component.traceConfig)[key].config.selectionConfigs
            .length > 0,
      )
      .findIndex((key) => key === configKey);
  }
});
