import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  Component,
  EventEmitter,
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
  @Input() testModes: String[] = [];
  @Output() selectedTestMode = new EventEmitter<String>();


  selectedMode : String= ""


  ngOnChanges(changes: SimpleChanges): void {

  }

  onActionSelected(action: String): void {
    this.selectedMode = action
    this.switchMode(action)
  }



   switchMode(mode : String) {
     this.selectedTestMode.emit(mode);
    }
}

