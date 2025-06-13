import { Component } from '@angular/core';
import { ContractorListComponent } from '../../components/contractor-list/contractor-list.component';

@Component({
  selector: 'app-contractors-page',
  standalone: true,
  imports: [ContractorListComponent],
  template: ` <app-contractor-list></app-contractor-list> `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class ContractorsPageComponent {}
