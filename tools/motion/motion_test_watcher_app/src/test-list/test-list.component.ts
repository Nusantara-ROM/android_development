import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MotionGolden } from '../model/golden';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-test-list',
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    MatIconModule,
    MatExpansionModule,
  ],
  templateUrl: './test-list.component.html',
  styleUrl: './test-list.component.css',
})
export class TestListComponent implements OnChanges{
  @Input() goldens: MotionGolden[] = [];
  @Input() testNames: String[] = [];
  @Output() selectedTestNameChange = new EventEmitter<String>();
  @Output() refreshRequest = new EventEmitter<boolean>();
  @Output() selectedGoldenChange = new EventEmitter<MotionGolden>();
  selectedGolden: MotionGolden | null = null;
  selectedTest: String | null = null;


  filterStatus: 'all' | 'pass' | 'fail' = 'all';

  totalTestCount = 0;
  passingTestCount = 0;
  failingTestCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['goldens']) {
      this.totalTestCount = this.goldens.length;
      this.failingTestCount = this.goldens.filter(
        (golden) => golden.result !== 'PASSED'
      ).length;
      this.passingTestCount = this.totalTestCount - this.failingTestCount;
      this.updateAndGroupGoldens()
    }
  }

  onFilterStatusChange(): void {
    this.updateAndGroupGoldens();
  }

  triggerRefresh(clear: boolean): void {
    this.refreshRequest.emit(clear);
  }

  panelOpened(golden: MotionGolden): void {
    this.selectedGolden = golden;
    this.selectedGoldenChange.emit(golden);
  }

  extractLastPart(path: String): String {
  return path.split('/').pop() || '';
}

 calculateGoldenFetchedTime(timestamp: string): string {
  const fetchedDate = new Date(timestamp)
  const millisecondsDiff = new Date().getTime() - fetchedDate.getTime();
  const minutesDiff = Math.round(millisecondsDiff / (60 * 1000));
  if (minutesDiff == 0){
    return "Fetched just now"
  }
  const hrs = Math.floor(minutesDiff/60)
  if (hrs > 0) {
    return `Fetched ${hrs} hour ${minutesDiff%60} mins ago`
  }else{
  return `Fetched ${minutesDiff} mins ago`;
  }
}

  testOpened(testName: String): void {
    console.log(`testName clicked : ${testName}`)
    this.selectedTest = testName;
    this.selectedTestNameChange.emit(testName);
  }

  private updateAndGroupGoldens(): void {
    let filteredGoldens: MotionGolden[];
    if (this.filterStatus === 'all') {
      filteredGoldens = this.goldens;
    } else if (this.filterStatus === 'pass') {
      filteredGoldens = this.goldens.filter((golden) => golden.result === 'PASSED');
    } else {
      filteredGoldens = this.goldens.filter((golden) => golden.result !== 'PASSED');
    }
    this.sortGoldensBasedOnFetchTime(filteredGoldens)
    this.filteredGoldens = this.groupGoldensByTime(filteredGoldens);
  }

  ngOnInit(): void {
    this.updateAndGroupGoldens();
  }

  private sortGoldensBasedOnFetchTime(goldens : MotionGolden[]) : void {
      goldens.sort((a, b) => {
      const dateA = new Date(a.testTime);
      const dateB = new Date(b.testTime);
      return dateB.getTime() - dateA.getTime();
      })
  }

  // Goldens grouped by their test fetch time
  filteredGoldens : { key: string; value: MotionGolden[] }[] = []

  private groupGoldensByTime(objectsList: MotionGolden[]): { key: string; value: MotionGolden[] }[] {
    const groupedDataMap = new Map<string, MotionGolden[]>();
    for (const obj of objectsList) {
      const timeKey = this.calculateGoldenFetchedTime(obj.testTime);
      if (groupedDataMap.has(timeKey)) {
        groupedDataMap.get(timeKey)!.push(obj);
      } else {
        groupedDataMap.set(timeKey, [obj]);
      }
    }
    return Array.from(groupedDataMap.entries()).map(([key, value]) => ({ key, value }));
  }

  getResultClass(golden: MotionGolden): string {
    const result = golden.result.trim().toUpperCase();
    if (result === 'MISSING_REFERENCE') {
      return 'border-l-4 border-yellow-500';
    } else if (result === 'FAILED') {
      return 'border-l-4 border-red-500';
    } else if (result === 'PASSED') {
      return 'border-l-4 border-green-500';
    } else {
      return '';
    }
  }
}

