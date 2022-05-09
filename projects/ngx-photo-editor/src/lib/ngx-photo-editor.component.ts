import {AfterContentInit, AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import Cropper from 'cropperjs';
import ViewMode = Cropper.ViewMode;
import { MatDialog, MatDialogRef } from '@angular/material';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ngx-photo-editor',
  templateUrl: './ngx-photo-editor.component.html',
  styleUrls: ['./ngx-photo-editor.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NgxPhotoEditorComponent {

  @ViewChild('ngxPhotoEditorContent', {static: false}) content;

  public cropper: Cropper;
  public outputImage: string;
  prevZoom = 0;

  @Input() dragMode = 'none';
  @Input() showCropButton = true;
  @Input() showFlipButtons = true;
  @Input() imageMovable = true;
  @Input() modalTitle = 'Photo Editor';
  @Input() hideModalHeader = false;
  @Input() aspectRatio = 1;
  @Input() autoCropArea = .8;
  @Input() autoCrop = true;
  @Input() mask = true;
  @Input() guides = true;
  @Input() centerIndicator = true;
  @Input() viewMode: ViewMode = 0;
  @Input() modalSize: size;
  @Input() modalCentered = false;
  @Input() scalable = true;
  @Input() zoomable = true;
  @Input() cropBoxMovable = true;
  @Input() cropBoxResizable = true;
  @Input() darkTheme = true;
  @Input() roundCropper = false;
  @Input() canvasHeight = 400;

  @Input() desiredFinalWidth: number;
  @Input() desiredFinalHeight: number;
  @Input() scaleCropBox: boolean; // set scaled dimensions based on desiredFinalWidth and desiredFinalHeight
  @Input() minCropBoxWidth: number;
  @Input() minCropBoxHeight: number;
  @Input() resizeToWidth: number;
  @Input() resizeToHeight: number;
  @Input() imageSmoothingEnabled = true;
  @Input() imageSmoothingQuality: ImageSmoothingQuality = 'high';
  url: string;
  lastUpdate = Date.now();

  format = 'png';
  quality = 92;

  isFormatDefined = false;

  dialogRef!: MatDialogRef<unknown, any>;

  @Output() imageCropped = new EventEmitter<CroppedEvent>();
  imageLoaded = false;

  constructor(private matDialog: MatDialog) {
  }

  @Input() set imageQuality(value: number) {
    if (value > 0 && value <= 100) {
      this.quality = value;
    }
  }

  @Input() set imageFormat(type: imageFormat) {
    if ((/^(gif|jpe?g|tiff|png|webp|bmp)$/i).test(type)) {
      this.format = type;
      this.isFormatDefined = true;
    }
  }

  @Input() set imageUrl(url: string) {
    if (url) {
      this.url = url;
      if (this.lastUpdate !== Date.now()) {
        this.open();
        this.lastUpdate = Date.now();
      }
    }
  }

  @Input() set imageBase64(base64: string) {
    if (base64 && (/^data:image\/([a-zA-Z]*);base64,([^\"]*)$/).test(base64)) {
      this.imageUrl = base64;
      if (!this.isFormatDefined) {
        this.format = ((base64.split(',')[0]).split(';')[0]).split(':')[1].split('/')[1];
      }
    }
  }

  @Input() set imageChangedEvent(event: any) {
    if (event) {
      const file = event.target.files[0];
      if (file && (/\.(gif|jpe?g|tiff|png|webp|bmp)$/i).test(file.name)) {
        if (!this.isFormatDefined) {
          this.format = event.target.files[0].type.split('/')[1];
        }
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          this.imageUrl = ev.target.result;
        };
        reader.readAsDataURL(event.target.files[0]);
      }
    }
  }

  @Input() set imageFile(file: File) {
    if (file && (/\.(gif|jpe?g|tiff|png|webp|bmp)$/i).test(file.name)) {
      if (!this.isFormatDefined) {
        this.format = file.type.split('/')[1];
      }
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        this.imageUrl = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Must be called on 'ready' event listener of image.
  // When viewing the image to be cropped in the modal, the image is likely not it's natural size.
  // The image is scaled. So we need to scale the cropper box as well. This will scale it 
  // to the proper size based on our desired output width and height.
  doScaleCropBox() {
    const shouldNotScale = !this.scaleCropBox || this.desiredFinalWidth == undefined || this.desiredFinalHeight == undefined || this.desiredFinalWidth < 1 || this.desiredFinalHeight < 1;
    if (shouldNotScale) {
      return;
    }

    const imageData = this.cropper.getImageData();
    console.log('imageData: ', imageData);

    const widthRatio = imageData.width / imageData.naturalWidth;
    const cropperWidth = this.desiredFinalWidth * widthRatio;

    const heightRatio = imageData.height / imageData.naturalHeight;
    const cropperHeight = this.desiredFinalHeight * heightRatio;

    this.cropper.setCropBoxData({ width: cropperWidth, height: cropperHeight});
    const data = this.cropper.getCropBoxData();
    console.log(this.cropper.getCropBoxData());

    // todo: if image is taller than it is wide, the left offset will be incorrect since the canvas will be wider 
    // than the image. The width is dynamic. So we need a way to get the width at runtime. Viewchild didn't work out.
    // need to mess with it more.
    const left = imageData.width / 2 - cropperWidth / 2;
    const top = this.canvasHeight / 2 - (cropperHeight / 2);
    this.cropper.setCropBoxData({ width: cropperWidth, height: cropperHeight, left, top });
    console.log(this.cropper.getCropBoxData());
  }

  onImageLoad(image) {

    image.addEventListener('ready', () => {
      if (this.roundCropper) {
        (document.getElementsByClassName('cropper-view-box')[0] as HTMLElement).style.borderRadius = '50%';
        (document.getElementsByClassName('cropper-face')[0] as HTMLElement).style.borderRadius = '50%';
      }
      this.imageLoaded = true;

      this.doScaleCropBox();
    });

    this.cropper = new Cropper(image, {
      aspectRatio: this.aspectRatio,
      autoCropArea: this.autoCropArea,
      autoCrop: this.autoCrop,
      modal: this.mask, // black mask
      guides: this.guides, // grid
      center: this.centerIndicator, // center indicator
      viewMode: this.viewMode,
      scalable: this.scalable,
      zoomable: this.zoomable,
      movable: this.imageMovable,
      dragMode: this.dragMode as any,
      cropBoxMovable: this.cropBoxMovable,
      cropBoxResizable: this.cropBoxResizable,
      minCropBoxWidth: this.minCropBoxWidth,
      minCropBoxHeight: this.minCropBoxHeight,
    });

    
  }

  rotateRight() {
    this.cropper.rotate(45);
  }

  rotateLeft() {
    this.cropper.rotate(-45);
  }

  crop() {
    this.cropper.setDragMode('crop');
  }

  move() {
    this.cropper.setDragMode('move');
  }

  zoom(event) {
    const value = Number(event.target.value);
    this.cropper.zoom(value - this.prevZoom);
    this.prevZoom = value;
  }

  zoomIn() {
    this.cropper.zoom(0.1);
  }

  zoomOut() {
    this.cropper.zoom(-0.1);
  }

  flipH() {
    this.cropper.scaleX(-this.cropper.getImageData().scaleX);
  }

  flipV() {
    this.cropper.scaleY(-this.cropper.getImageData().scaleY);
  }

  reset() {
    this.cropper.reset();
    this.doScaleCropBox();
  }

  export() {

    this.dialogRef.close();

    let cropedImage;
    if (this.resizeToWidth && this.resizeToHeight) {
      cropedImage = this.cropper.getCroppedCanvas({
        width: this.resizeToWidth,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else if (this.resizeToHeight) {
      cropedImage = this.cropper.getCroppedCanvas({
        height: this.resizeToHeight,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else if (this.resizeToWidth) {
      cropedImage = this.cropper.getCroppedCanvas({
        width: this.resizeToWidth,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else {
      cropedImage = this.cropper.getCroppedCanvas({
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    }

    this.downloadImage(cropedImage);

    this.outputImage = cropedImage.toDataURL('image/' + this.format, this.quality);
    cropedImage.toBlob(blob => {
      this.imageCropped.emit({
        base64: this.outputImage,
        file: new File([blob], Date.now() + '.' + this.format, {type: 'image/' + this.format})
      });
    }, 'image/' + this.format, this.quality / 100);
    this.imageLoaded = false;
  }

  downloadImage(croppedImage: any) {
    const outputImage = croppedImage.toDataURL('image/' + this.format, this.quality).replace("image/png", "application/octet-stream");
    const link = document.createElement('a');
    link.addEventListener('click', function () {
      link.href = outputImage;
      link.download = "myimage.png";
    }, false);

    link.click();
  }

  open() {
    this.dialogRef = this.matDialog.open(this.content, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: 'ngxpe',
});
  }

  cancel() {
    this.dialogRef.close();
    this.imageLoaded = false;
  }
}

export interface CroppedEvent {
  base64?: string;
  file?: File;
}

export type imageFormat = 'gif' | 'jpeg' | 'tiff' | 'png' | 'webp' | 'bmp';

export type size = 'sm' | 'lg' | 'xl' | string;
