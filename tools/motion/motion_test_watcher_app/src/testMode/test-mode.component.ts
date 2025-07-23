import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'test-mode-list',
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    MatIconModule,
    MatExpansionModule,
    MatMenuModule
  ],
  templateUrl: './test-mode.component.html',
})
export class TestModeComponent implements OnChanges{
  constructor(private elementRef: ElementRef) {}

  @Input() testModes: String[] = [];
  @Input() testMode: String = "";  // will either be GERRIT OR PRESUBMIT (special cases that cannot come in test modes api response)
  @Output() selectedTestMode = new EventEmitter<String>();


  selectedMode : String= ""
  showDropdown = false

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['testModes'] && this.testMode.length == 0) {
      this.setFirstTestModeAsDefaultMode()
    }
    if (changes["testMode"] && this.testMode.length > 0) {
      this.selectedMode = this.testMode
    }
  }

  onActionSelected(action: String): void {
    this.selectedMode = action
    this.switchMode(action)
    this.toggleDropdown()
  }

  switchMode(mode : String) {
    this.selectedTestMode.emit(mode);
  }

  setFirstTestModeAsDefaultMode() {
    if (this.testModes[0] != null) {
      this.selectedMode = this.testModes[0]
      this.switchMode(this.selectedMode)
    }
  }
}

