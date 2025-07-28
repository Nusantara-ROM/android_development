import { ProgressTracker } from './../util/progress';
import { GoldensService } from './../service/goldens.service';
import { Component, DoCheck, OnDestroy, OnInit } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TestListComponent } from '../test-list/test-list.component';
import { PreviewComponent } from '../preview/preview.component';
import { TimelineComponent } from '../timeline/timeline.component';
import { MotionGolden } from '../model/golden';
import { finalize, Subscription } from 'rxjs';
import { NgFor } from '@angular/common';
import { JsonPipe, NgIf, NgStyle } from '@angular/common';
import {
  trigger,
  state,
  style,
  animate,
  transition
} from '@angular/animations';

import { DialogContentComponent } from '../dialog/dialog.component';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TestModeComponent } from '../testMode/test-mode.component';
import { PreviewService } from '../service/preview.service';
import { ErrorService } from '../service/error.service';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-root',
  imports: [
    MatToolbarModule,
    TestListComponent,
    PreviewComponent,
    TimelineComponent,
    NgIf,
    MatButton,
    MatProgressSpinnerModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    NgStyle,
    TestModeComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [
    trigger('sidebarMenuAnimation', [
      state('void', style({
        width: '0',
        opacity: 0,
        overflow: 'hidden'
      })),
      transition(':enter', [
        style({ width: '0', opacity: 0 }),
        animate('300ms ease-out', style({ width: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ width: '*', opacity: 1 }),
        animate('250ms ease-in', style({ width: '0', opacity: 0 }))
      ])
    ]),

    trigger('collapseAnimation', [
      state('void', style({
        height: '0',
        opacity: 0,
        overflow: 'hidden'
      })),

      state('*', style({
        height: '*',
        opacity: 1,
        overflow: 'hidden'
      })),

      transition(':enter', [
        animate('300ms ease-out')
      ]),

      transition(':leave', [
        animate('300ms ease-in')
      ])
    ]),
    trigger('timelineHeightChange', [
      state('true', style({ height: 'calc(66.6666% - 16px)' })),
      state('false', style({ height: '100%' })),
      transition('true <=> false', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class AppComponent implements DoCheck, OnInit, OnDestroy {
  constructor(
    private goldenService: GoldensService,
    private progressTracker: ProgressTracker,
    public dialog: MatDialog,
    private errorService: ErrorService,
    private snackBar: MatSnackBar,
    private previewService: PreviewService
    ) {}

  private errorSubscription!: Subscription;

  isNullOrEmpty(obj : any) : Boolean {
    return (obj == null || obj.length == 0)
  }
  testModes: String[] =  []

 switchMode(mode : String) {
    this.showLoaderBar()
    this.testMode = ""
    this.goldenService.switchMode(mode).
    pipe(finalize(() => this.hideLoaderBar()))
    .subscribe((goldens) => {
      this.testNames = []
      this.selectedTest = null
      this.selectedGolden = null
      this.goldens = goldens || []
    });
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(DialogContentComponent, {
      maxWidth: '55vw'
    });

    dialogRef.afterClosed().subscribe(invocationID => {
      if (invocationID) {
        this.showLoaderBar()
        this.goldenService.getTestArtifacts(invocationID)
        .pipe(finalize(() => this.hideLoaderBar()))
        .subscribe({
          next : (fetchedTestNames) => {
            if (this.isNullOrEmpty(fetchedTestNames)) {
              fetchedTestNames = []
              console.log("No artifacts found")
              alert("No artifacts found")
            }
            this.goldens = []
            this.selectedGolden = null
            this.testNames = fetchedTestNames
            this.testMode = "PRESUBMIT"
          },
          error : (err) => {
            this.testNames = []
            this.goldens = []
            this.selectedGolden = null
            this.showErrorAlert(err)
          }
        })
      }
    });
  }

  showProgress = false;
  testMode = "";
  showLoader = false;
  goldens: MotionGolden[] = [];
  testNames: String[] = [];
  selectedTest: String | null = null;
  selectedGolden: MotionGolden | null = null;
  showTestList: boolean = true;
  showCheckBoxes: boolean =false;
  showPreviewComponent: boolean = true;
  isRefreshing: boolean = false;

  get isVideoPresent(): boolean {
    return this.selectedGolden?.videoUrl != null;
  }

  toggleTestListVisibility() {
    this.showTestList = !this.showTestList;
  }

  showErrorAlert(err: Error) {
    alert(`Some error occurred ${err.message}`)
  }
  showLoaderBar() : void {
    this.showLoader = true;
  }

  hideLoaderBar() : void {
    this.showLoader = false;
  }


  ngDoCheck(): void {
    this.showProgress = this.progressTracker.isActive;
  }

  ngOnInit(): void {
    const searchParams = new URLSearchParams(window.location.search);
    const leftLink = searchParams.get('leftLink') ?? ""
    const rightLink = searchParams.get('rightLink') ?? ""

    this.errorSubscription = this.errorService.error$.subscribe(error => {
      const config: any = {
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
      }
      if(error.displayDuration != null){
        config.duration = error.displayDuration
      }
      this.snackBar.open(error.message, undefined, config);
    });

    if(leftLink || rightLink){
      this.testMode = "GERRIT"
      this.fetchGerritData(leftLink, rightLink)
    } else {
      console.log("GERRIT: left and right is null")
    }
    this.goldenService.getTestModes().subscribe((modes)=> {
      this.testModes = modes
      console.log(modes)
    })
  }

  fetchGerritData(leftLink: string, rightLink: string){
    this.showLoaderBar()
    this.goldenService
      .getGerritData(leftLink, rightLink)
      .pipe(finalize(() => this.hideLoaderBar()))
      .subscribe((goldens) => {
        this.goldens = JSON.parse(JSON.stringify(goldens)) as MotionGolden[]
        this.setSelectedGolden(JSON.parse(JSON.stringify(goldens[0])) as MotionGolden)
      })
  }

  fetchGoldens(): void {
    this.progressTracker.beginProgress;
    this.goldenService
      .getGoldens()
      .pipe(finalize(() => this.progressTracker.endProgress))
      .subscribe((goldens) => (this.goldens = goldens));
  }

  refreshGoldens(clear: boolean): void {
    this.isRefreshing = true;
    this.progressTracker.beginProgress();
    this.goldenService
      .refreshGoldens(clear)
      .pipe(
        finalize(() => {
          this.isRefreshing = false;
          this.progressTracker.endProgress();
        })
      )
      .subscribe({
        next: (goldens) => {
          this.goldens = goldens;
          this.snackBar.open('Refresh successful!', 'Dismiss', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['snackbar-success']
          });
        },
      });
  }

  setSelectedGolden(golden: MotionGolden): void {
    this.selectedGolden = golden;
    this.previewService.setShowMarker(this.showPreviewComponent && this.isVideoPresent);
  }

   setSelectedTest(testName: String): void {
    this.selectedTest = testName;
    this.showLoaderBar();
    this.goldenService.getTestArtifactsForTestName(testName).pipe(finalize(() => this.hideLoaderBar())).subscribe({
      next: (fetchedGolden) => {
        this.selectedGolden = fetchedGolden
      },
      error: (err) => {
        this.goldens = [];
        this.selectedGolden = null;
        this.showErrorAlert(err)
      }
    })
  }

  toggleCheckBoxes(): void {
    this.showCheckBoxes = !this.showCheckBoxes;
  }
  openPreviewComponent(): void {
    this.showPreviewComponent = !this.showPreviewComponent;
    this.previewService.setShowMarker(this.showPreviewComponent && this.isVideoPresent);
  }
  ngOnDestroy() {
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
  }
}
