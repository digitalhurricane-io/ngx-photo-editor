import {ChangeDetectorRef, Component, ViewChild} from '@angular/core';
import {CroppedEvent, NgxPhotoEditorComponent} from 'ngx-photo-editor';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('photoEditor', {static: false}) photoEditor: NgxPhotoEditorComponent;

  base64: any;
  fileChangedEvent: any;
  imageUrl: any;

  constructor(private cd: ChangeDetectorRef) {}

  fileChangeEvent(event: any) {
    this.fileChangedEvent = event;
  }


  imageCropped(event: CroppedEvent) {
    console.log(event);
    this.base64 = event.base64;
    this.cd.detectChanges();
  }

  gotoGithub() {
    window.open('https://github.com/AhamedBilal/ngx-photo-editor');
  }

  export() {
    this.photoEditor.export();
  }

}
