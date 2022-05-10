import {NgModule} from '@angular/core';
import {NgxPhotoEditorComponent} from './ngx-photo-editor.component';
import {CommonModule} from '@angular/common';
import { MatButtonModule, MatDialogModule, MatTooltipModule } from '@angular/material';


@NgModule({
  declarations: [NgxPhotoEditorComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  exports: [NgxPhotoEditorComponent],
  entryComponents: [NgxPhotoEditorComponent]
})
export class NgxPhotoEditorModule {
}
