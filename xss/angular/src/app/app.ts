import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly sanitizer = inject(DomSanitizer);

  content = '<strong>Hello</strong><img src=x onerror=alert(1)>';
  dangerousUrl = 'javascript:alert(1)';

  // 繞過防護的區塊預設不顯示，按下按鈕才渲染，避免一打開頁面就跳 alert
  readonly showBypass = signal(false);
  readonly trustedContent = computed(() =>
    this.showBypass() ? this.sanitizer.bypassSecurityTrustHtml(this.content) : '',
  );
}
