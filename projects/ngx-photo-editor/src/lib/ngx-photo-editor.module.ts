import {NgModule} from '@angular/core';
import {NgxPhotoEditorComponent} from './ngx-photo-editor.component';
import {CommonModule} from '@angular/common';
import { MatTooltipModule } from '@angular/material';


@NgModule({
  declarations: [NgxPhotoEditorComponent],
  imports: [
    CommonModule,
    MatTooltipModule,
  ],
  exports: [NgxPhotoEditorComponent],
  entryComponents: [NgxPhotoEditorComponent]
})
export class NgxPhotoEditorModule {
}
