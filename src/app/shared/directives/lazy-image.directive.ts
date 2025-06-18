import { Directive, ElementRef, Input, OnInit } from '@angular/core';

/**
 * Directive to automatically add lazy loading to images
 * Also provides fallback image support and loading states
 */
@Directive({
  selector: 'img[appLazyImage]',
  standalone: true,
})
export class LazyImageDirective implements OnInit {
  @Input() fallbackSrc?: string;
  @Input() loadingClass = 'image-loading';
  @Input() errorClass = 'image-error';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit() {
    const img = this.el.nativeElement;

    // Add lazy loading if not already present
    if (!img.loading) {
      img.loading = 'lazy';
    }

    // Add loading class initially
    img.classList.add(this.loadingClass);

    // Handle load success
    img.addEventListener('load', () => {
      img.classList.remove(this.loadingClass);
      img.classList.remove(this.errorClass);
    });

    // Handle load error
    img.addEventListener('error', () => {
      img.classList.remove(this.loadingClass);
      img.classList.add(this.errorClass);

      if (this.fallbackSrc && img.src !== this.fallbackSrc) {
        img.src = this.fallbackSrc;
      }
    });

    // Add intersection observer for even better control
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is visible, ensure it starts loading
            const target = entry.target as HTMLImageElement;
            if (target.dataset['src']) {
              target.src = target.dataset['src'];
              delete target.dataset['src'];
            }
            observer.unobserve(target);
          }
        });
      });

      observer.observe(img);
    }
  }
}
