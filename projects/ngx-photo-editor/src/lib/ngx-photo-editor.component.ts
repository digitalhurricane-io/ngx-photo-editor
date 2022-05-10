import { Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import Cropper from 'cropperjs';
import ViewMode = Cropper.ViewMode;


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ngx-photo-editor',
  templateUrl: './ngx-photo-editor.component.html',
  styleUrls: ['./ngx-photo-editor.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NgxPhotoEditorComponent {

  public cropper: Cropper;
  public outputImage: string;
  prevZoom = 0;

  @Input() dragMode = 'none';
  @Input() showCropButton = true;
  @Input() showFlipButtons = true;
  @Input() imageMovable = true;
  @Input() aspectRatio = 1;
  @Input() autoCropArea = .8;
  @Input() autoCrop = true;
  @Input() mask = true;
  @Input() guides = true;
  @Input() centerIndicator = true;
  @Input() viewMode: ViewMode = 0;
  @Input() scalable = true;
  @Input() zoomable = true;
  @Input() cropBoxMovable = true;
  @Input() cropBoxResizable = true;
  @Input() darkTheme = true;
  @Input() roundCropper = false;

  // If a user tries to load an image that is smaller than specified Dimensions,
  // the imageTooSmall event will be emitted and the image will not be loaded.
  @Input() minImageDimensions: Dimensions; 

  // Cropbox cannot be scaled lower than this
  @Input() minFinalDimensions: Dimensions;

  @Input() minCropBoxWidthRelativeToPage: number;
  @Input() minCropBoxHeightRelativeToPage: number;
  @Input() resizeToWidth: number;
  @Input() resizeToHeight: number;
  @Input() imageSmoothingEnabled = true;
  @Input() imageSmoothingQuality: ImageSmoothingQuality = 'high';

  @Output() imageTooSmall = new EventEmitter<Dimensions>();

  // Exposed for internationalization
  @Input() tooltipCropText = "Move Cropper";
  @Input() tooltipDragText = "Move Image";
  @Input() tooltipRotateLeftText = "Rotate Left";
  @Input() tooltipRotateRightText = "Rotate Right";
  @Input() tooltipResetText = "Reset";

  url: string;
  lastUpdate = Date.now();

  format = 'png';
  quality = 92;

  isFormatDefined = false;

  @Output() imageCropped = new EventEmitter<CroppedEvent>();
  imageLoaded = false;

  constructor() {
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
    if (!url) {
      return;
    }

    // If image url was the same as previous, the load event on the <img> will not fire.
    // so set to empty string first.
    this.url = ''; 

    // Give change detection time to run.
    setTimeout(() => {
      this.url = url;
      if (this.lastUpdate !== Date.now()) {
        this.lastUpdate = Date.now();
      }
    }, 0);
      
  }

  @Input() set imageBase64(base64: string) {
    if (base64 && (/^data:image\/([a-zA-Z]*);base64,([^\"]*)$/).test(base64)) {
      this.imageUrl = base64;
      if (!this.isFormatDefined) {
        this.format = ((base64.split(',')[0]).split(';')[0]).split(':')[1].split('/')[1];
      }
    }
  }

  // When user uploads a file, this event will be changed.
  @Input() set fileChangedEvent(event: any) {
    if (!event) {
      return;
    }
    
    const file = event.target.files[0];
    if (file && (/\.(gif|jpe?g|tiff|png|webp|bmp)$/i).test(file.name)) {
      if (!this.isFormatDefined) {
        this.format = event.target.files[0].type.split('/')[1];
      }
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const imageUrl = ev.target.result;

        this.checkImageDimensions(imageUrl).then(() => {
          // Open dialog
          this.imageUrl = imageUrl;
        })
          .catch((d: Dimensions) => {
            // Image is too small, emit an event and do not open the dialog
            this.imageTooSmall.emit(d)
          })
          .finally(() => {
            // Ensures that if the user selects the same file again, the change event will still be fired.
            event.target.value = null;
          });
      };
      reader.readAsDataURL(event.target.files[0]);
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

  // return a promise that rejects if image Dimensions are less than 
  // this.desiredFinalHeight and this.desiredFinalWidth and this.requireDesiredFinalDimensions is true
  private checkImageDimensions(url: string) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;

      image.onload = () => {
        // access image size here 
        const dimensions = { width: image.width, height: image.height };

        if (this.minImageDimensions) {
          if (image.width < this.minImageDimensions.width || image.height < this.minImageDimensions.height) {
            reject(dimensions);
            return;
          }
        }

        resolve(dimensions);
      };
    });
  }

  // Must be called on 'ready' event listener of image.
  // When viewing the image to be cropped in the modal, the image is likely not it's natural size.
  // The image is scaled. So we need to scale the cropper box as well. This will scale it 
  // to the proper size based on our desired output width and height.
  private doScaleCropBox() {
    if (!this.minFinalDimensions) {
      return;
    }

    let width = this.minFinalDimensions.width;
    let height = this.minFinalDimensions.height;

    if (width === 0 && height === 0) {
      width = 500;
      height = 500;
    }

    const d = this.minScaledCropperDimensions(width, height);

    this.centerCropper(d.width, d.height);
  }

  private minScaledCropperDimensions(minFinalWidth: number, minFinalHeight: number): Dimensions {
    if (minFinalWidth === 0 && minFinalHeight === 0) {
      return {width: 0, height: 0};
    }

    const imageData = this.cropper.getImageData();

    const widthRatio = imageData.width / imageData.naturalWidth;
    const cropperWidth = minFinalWidth * widthRatio;

    const heightRatio = imageData.height / imageData.naturalHeight;
    const cropperHeight = minFinalHeight * heightRatio;

    return { width: cropperWidth, height: cropperHeight };
  }

  private centerCropper(cropperWidth: number, cropperHeight: number) {
    const box: HTMLElement = document.getElementById('ngx-photo-editor-img-container');
    const left = box.clientWidth / 2 - (cropperWidth / 2);
    const top = box.clientHeight / 2 - (cropperHeight / 2);
    this.cropper.setCropBoxData({ width: cropperWidth, height: cropperHeight, left, top });
  }

  onImageLoad(image) {

    if (this.cropper) {
      this.cropper.destroy();
    }

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
      minCropBoxWidth: this.minCropBoxWidthRelativeToPage,
      minCropBoxHeight: this.minCropBoxHeightRelativeToPage,
      cropmove: () => {
        return this.enforceMinCropBoxDimensions();
      }
    });

  }

  // should be called on every cropmove event
  private enforceMinCropBoxDimensions() {
    if (!this.minFinalDimensions) {
      return;
    }

    const data = this.cropper.getCropBoxData();
    const minDimensions = this.minScaledCropperDimensions(this.minFinalDimensions.width, this.minFinalDimensions.height);

    const isTooSmall = data.width < minDimensions.width || data.height < minDimensions.height;

    if (isTooSmall) {

      const newDimensions = { width: data.width, height: data.height };

      if (data.width < minDimensions.width) {
        newDimensions.width = minDimensions.width;
      }
      if (data.height < minDimensions.height) {
        newDimensions.height = minDimensions.height;
      }

      // resize crop box
      this.cropper.setCropBoxData({ width: newDimensions.width, height: newDimensions.height });

      return false; // stop crop move
    }
    return true; // continue crop move
  }

  rotateRight() {
    this.cropper.rotate(45);
  }

  rotateLeft() {
    this.cropper.rotate(-45);
  }

  crop() {
    this.cropper.setDragMode('none');
    //this.cropper.setDragMode('crop');
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

    let croppedImage;
    if (this.resizeToWidth && this.resizeToHeight) {
      croppedImage = this.cropper.getCroppedCanvas({
        width: this.resizeToWidth,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else if (this.resizeToHeight) {
      croppedImage = this.cropper.getCroppedCanvas({
        height: this.resizeToHeight,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else if (this.resizeToWidth) {
      croppedImage = this.cropper.getCroppedCanvas({
        width: this.resizeToWidth,
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    } else {
      croppedImage = this.cropper.getCroppedCanvas({
        imageSmoothingEnabled: this.imageSmoothingEnabled,
        imageSmoothingQuality: this.imageSmoothingQuality
      });
    }

    this.outputImage = croppedImage.toDataURL('image/' + this.format, this.quality);
    croppedImage.toBlob(blob => {
      this.imageCropped.emit({
        base64: this.outputImage,
        file: new File([blob], Date.now() + '.' + this.format, {type: 'image/' + this.format})
      });
    }, 'image/' + this.format, this.quality / 100);
    this.imageLoaded = false;

    this.cropper.destroy();
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

  cancel() {
    this.imageLoaded = false;
  }
}

export interface CroppedEvent {
  base64?: string;
  file?: File;
}

export type imageFormat = 'gif' | 'jpeg' | 'tiff' | 'png' | 'webp' | 'bmp';

export interface Dimensions {
  width: number;
  height: number;
}