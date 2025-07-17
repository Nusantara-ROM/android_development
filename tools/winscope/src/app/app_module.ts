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

import {CdkAccordionModule} from '@angular/cdk/accordion';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {CdkMenuModule} from '@angular/cdk/menu';
import {OverlayModule} from '@angular/cdk/overlay';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {CUSTOM_ELEMENTS_SCHEMA, ErrorHandler, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatDividerModule} from '@angular/material/divider';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatLegacyButtonModule as MatButtonModule} from '@angular/material/legacy-button';
import {MatLegacyCardModule as MatCardModule} from '@angular/material/legacy-card';
import {MatLegacyCheckboxModule as MatCheckboxModule} from '@angular/material/legacy-checkbox';
import {MatLegacyPseudoCheckboxModule as MatPseudoCheckboxModule} from '@angular/material/legacy-core';
import {MatLegacyDialogModule as MatDialogModule} from '@angular/material/legacy-dialog';
import {MatLegacyFormFieldModule as MatFormFieldModule} from '@angular/material/legacy-form-field';
import {MatLegacyInputModule as MatInputModule} from '@angular/material/legacy-input';
import {MatLegacyListModule as MatListModule} from '@angular/material/legacy-list';
import {MatLegacyProgressBarModule as MatProgressBarModule} from '@angular/material/legacy-progress-bar';
import {MatLegacyProgressSpinnerModule as MatProgressSpinnerModule} from '@angular/material/legacy-progress-spinner';
import {MatLegacyRadioModule as MatRadioModule} from '@angular/material/legacy-radio';
import {MatLegacySelectModule as MatSelectModule} from '@angular/material/legacy-select';
import {MatLegacySliderModule as MatSliderModule} from '@angular/material/legacy-slider';
import {MatLegacySnackBarModule as MatSnackBarModule} from '@angular/material/legacy-snack-bar';
import {MatLegacyTableModule as MatTableModule} from '@angular/material/legacy-table';
import {MatLegacyTabsModule as MatTabsModule} from '@angular/material/legacy-tabs';
import {MatLegacyTooltipModule as MatTooltipModule} from '@angular/material/legacy-tooltip';
import {MatToolbarModule} from '@angular/material/toolbar';
import {BrowserModule, Title} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {VariableHeightScrollDirective} from 'viewers/common/variable_height_scroll_directive';
import {CollapsedSectionsComponent} from 'viewers/components/collapsed_sections_component';
import {CollapsibleSectionTitleComponent} from 'viewers/components/collapsible_section_title_component';
import {CoordinatesTableComponent} from 'viewers/components/coordinates_table_component';
import {HierarchyComponent} from 'viewers/components/hierarchy_component';
import {HierarchyTreeNodeDataViewComponent} from 'viewers/components/hierarchy_tree_node_data_view_component';
import {ImeAdditionalPropertiesComponent} from 'viewers/components/ime_additional_properties_component';
import {LogComponent} from 'viewers/components/log_component';
import {PropertiesComponent} from 'viewers/components/properties_component';
import {PropertiesTableComponent} from 'viewers/components/properties_table_component';
import {PropertyTreeNodeDataViewComponent} from 'viewers/components/property_tree_node_data_view_component';
import {RectsComponent} from 'viewers/components/rects/rects_component';
import {SearchBoxComponent} from 'viewers/components/search_box_component';
import {SelectWithFilterComponent} from 'viewers/components/select_with_filter_component';
import {SurfaceFlingerPropertyGroupsComponent} from 'viewers/components/surface_flinger_property_groups_component';
import {TransformMatrixComponent} from 'viewers/components/transform_matrix_component';
import {TreeComponent} from 'viewers/components/tree_component';
import {TreeNodeComponent} from 'viewers/components/tree_node_component';
import {UserOptionsComponent} from 'viewers/components/user_options_component';
import {ViewerInputMethodComponent} from 'viewers/components/viewer_input_method_component';
import {ViewCapturePropertyGroupsComponent} from 'viewers/components/view_capture_property_groups_component';
import {ViewerInputComponent} from 'viewers/viewer_input/viewer_input_component';
import {ViewerJankCujsComponent} from 'viewers/viewer_jank_cujs/viewer_jank_cujs_component';
import {ViewerMediaBasedComponent} from 'viewers/viewer_media_based/viewer_media_based_component';
import {ViewerProtologComponent} from 'viewers/viewer_protolog/viewer_protolog_component';
import {ActiveSearchComponent} from 'viewers/viewer_search/active_search_component';
import {SearchListComponent} from 'viewers/viewer_search/search_list_component';
import {ViewerSearchComponent} from 'viewers/viewer_search/viewer_search_component';
import {ViewerSurfaceFlingerComponent} from 'viewers/viewer_surface_flinger/viewer_surface_flinger_component';
import {ViewerTransactionsComponent} from 'viewers/viewer_transactions/viewer_transactions_component';
import {ViewerTransitionsComponent} from 'viewers/viewer_transitions/viewer_transitions_component';
import {ViewerViewCaptureComponent} from 'viewers/viewer_view_capture/viewer_view_capture_component';
import {ViewerWindowManagerComponent} from 'viewers/viewer_window_manager/viewer_window_manager_component';
import {AppComponent} from './components/app_component';
import {
  MatDrawer,
  MatDrawerContainer,
  MatDrawerContent,
} from './components/bottomnav/bottom_drawer_component';
import {CollectTracesComponent} from './components/collect_traces_component';
import {LoadProgressComponent} from './components/load_progress_component';
import {ShortcutsComponent} from './components/shortcuts_component';
import {SnackBarComponent} from './components/snack_bar_component';
import {DefaultTimelineRowComponent} from './components/timeline/expanded-timeline/default_timeline_row_component';
import {ExpandedTimelineComponent} from './components/timeline/expanded-timeline/expanded_timeline_component';
import {TransitionTimelineComponent} from './components/timeline/expanded-timeline/transition_timeline_component';
import {MiniTimelineComponent} from './components/timeline/mini-timeline/mini_timeline_component';
import {SliderComponent} from './components/timeline/mini-timeline/slider_component';
import {TimelineComponent} from './components/timeline/timeline_component';
import {TraceConfigComponent} from './components/trace_config_component';
import {TraceViewComponent} from './components/trace_view_component';
import {UploadTracesComponent} from './components/upload_traces_component';
import {WarningDialogComponent} from './components/warning_dialog_component';
import {WdpSetupComponent} from './components/wdp_setup_component';
import {WinscopeProxySetupComponent} from './components/winscope_proxy_setup_component';
import {GlobalErrorHandler} from './global_error_handler';

@NgModule({
  declarations: [
    AppComponent,
    ViewerWindowManagerComponent,
    ViewerSurfaceFlingerComponent,
    ViewerInputComponent,
    ViewerInputMethodComponent,
    ViewerProtologComponent,
    ViewerJankCujsComponent,
    ViewerTransactionsComponent,
    ViewerMediaBasedComponent,
    ViewerTransitionsComponent,
    ViewerViewCaptureComponent,
    ViewerSearchComponent,
    CollectTracesComponent,
    UploadTracesComponent,
    WinscopeProxySetupComponent,
    WdpSetupComponent,
    TraceConfigComponent,
    HierarchyComponent,
    PropertiesComponent,
    RectsComponent,
    TraceViewComponent,
    TreeComponent,
    TreeNodeComponent,
    HierarchyTreeNodeDataViewComponent,
    PropertyTreeNodeDataViewComponent,
    SurfaceFlingerPropertyGroupsComponent,
    TransformMatrixComponent,
    PropertiesTableComponent,
    ImeAdditionalPropertiesComponent,
    CoordinatesTableComponent,
    TimelineComponent,
    MiniTimelineComponent,
    ExpandedTimelineComponent,
    DefaultTimelineRowComponent,
    TransitionTimelineComponent,
    SnackBarComponent,
    MatDrawer,
    MatDrawerContent,
    MatDrawerContainer,
    LoadProgressComponent,
    SliderComponent,
    VariableHeightScrollDirective,
    ViewCapturePropertyGroupsComponent,
    SelectWithFilterComponent,
    ShortcutsComponent,
    CollapsedSectionsComponent,
    CollapsibleSectionTitleComponent,
    UserOptionsComponent,
    LogComponent,
    WarningDialogComponent,
    SearchBoxComponent,
    SearchListComponent,
    ActiveSearchComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    FormsModule,
    MatListModule,
    MatCheckboxModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatSliderModule,
    MatRadioModule,
    MatTooltipModule,
    MatToolbarModule,
    MatTabsModule,
    MatSnackBarModule,
    ScrollingModule,
    DragDropModule,
    ClipboardModule,
    ReactiveFormsModule,
    CdkMenuModule,
    MatDialogModule,
    MatTableModule,
    OverlayModule,
    CdkAccordionModule,
    MatButtonToggleModule,
    MatPseudoCheckboxModule,
  ],
  providers: [Title, {provide: ErrorHandler, useClass: GlobalErrorHandler}],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
