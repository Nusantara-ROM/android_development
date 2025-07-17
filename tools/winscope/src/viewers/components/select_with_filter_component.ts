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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {MatLegacyOption as MatOption} from '@angular/material/legacy-core';
import {
  MatLegacySelect as MatSelect,
  MatLegacySelectChange as MatSelectChange,
} from '@angular/material/legacy-select';
import {AbstractSelectComponent} from './abstract_select_component';

@Component({
  selector: 'select-with-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field
      [style]="getOuterFormFieldStyle()"
      [style.text-align]="'unset'"
      [appearance]="appearance"
      [class]="formFieldClass"
      [matTooltip]="label"
      matTooltipPosition="above"
      [matTooltipDisabled]="disableFormFieldTooltip(formField)"
      [class.mat-body-2]="!select.value || select.value.length === 0"  #formField>
      <mat-label>{{ label }}</mat-label>
      <mat-select
        (opened)="onSelectOpened(select, filter)"
        (closed)="onSelectClosed()"
        (selectionChange)="onSelectChange($event)"
        [multiple]="true"
        #select>
        <mat-form-field class="select-filter" [style]="getInnerFormFieldStyle()">
          <mat-label>Filter options</mat-label>
          <input matInput #filter [(ngModel)]="filterString" />
        </mat-form-field>
        <div *ngIf="(select.value?.length ?? 0) > 0" class="selected-options">
          <span class="mat-option mat-active">Selected:</span>
          <div
            class="mat-option mat-selected mat-option-multiple mat-active selected-option"
            *ngFor="let option of selectedOptions(select)"
            (click)="onSelectedOptionClick(option, select)">
          <mat-pseudo-checkbox
            color="primary"
            state="checked"
            class="mat-option-pseudo-checkbox"></mat-pseudo-checkbox>
          <div class="mat-option-text">{{option}}</div>
          </div>
        </div>
        <mat-divider [vertical]="false"></mat-divider>
        <mat-option
          *ngFor="let option of options; index as i"
          [value]="option"
          class="option no-focus"
          [class.hidden-option]="hideOption(option, filterString)"
          (click)="onOptClick($event, i, select, matOption)"
          #matOption>{{ option }}</mat-option>
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `
      mat-form-field {
        width: 100%;
      }

      .hidden-option {
        display: none;
      }

      .selected-options {
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
export class SelectWithFilterComponent extends AbstractSelectComponent<HTMLInputElement> {
  @Input() options: string[] = [];
  @Input() outerFilterWidth = '100px';
  @Input() innerFilterWidth = '100';
  @Input() flex = 'none';

  @Output() readonly selectChange = new EventEmitter<MatSelectChange>();

  filterString: string = '';

  private lastClickedIndex: number | undefined;

  onSelectChange(event: MatSelectChange) {
    this.selectChange.emit(event);
  }

  getOuterFormFieldStyle() {
    return {
      flex: this.flex,
      width: this.outerFilterWidth,
    };
  }

  getInnerFormFieldStyle() {
    return {
      flex: 'none',
      paddingTop: '2px',
      paddingLeft: '10px',
      paddingRight: '20px',
      width: this.innerFilterWidth + 'px',
    };
  }

  onSelectOpened(select: MatSelect, filter: HTMLInputElement) {
    this.handleSelectOpened(select, filter);
    filter.focus();
  }

  onSelectClosed() {
    this.filterString = '';
  }

  onOptClick(e: MouseEvent, i: number, select: MatSelect, option: MatOption) {
    const selectValueChanged = this.handleOptionClick({
      event: e,
      i,
      select,
      option,
      lastClickedIndex: this.lastClickedIndex,
      options: this.options,
      filterString: this.filterString,
    });
    if (selectValueChanged) {
      this.selectChange.emit(new MatSelectChange(select, select.value));
    }
    this.lastClickedIndex = i;
  }

  selectedOptions(select: MatSelect) {
    return this.options.filter((o) => select.value.includes(o));
  }

  onSelectedOptionClick(option: string, select: MatSelect) {
    select.value = select.value.filter((val: string) => val !== option);
    this.selectChange.emit(new MatSelectChange(select, select.value));
  }

  protected override onKeydownCtrlA(select: MatSelect) {
    this.handleKeydownCtrlA(select, this.options, this.filterString);
    this.selectChange.emit(new MatSelectChange(select, select.value));
  }
}
