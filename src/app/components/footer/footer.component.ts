import { Component } from '@angular/core';
import { AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  @ViewChild('instructiveModal') modalElementRef!: ElementRef;

  ngAfterViewInit(): void {
    const modalEl = this.modalElementRef?.nativeElement;
    if (modalEl) {
      const modal = new Modal(modalEl);
      modal.show();
    }
  }
}
