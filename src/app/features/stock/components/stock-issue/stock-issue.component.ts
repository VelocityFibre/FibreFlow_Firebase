
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService } from '../services/stock.service';
import { StockItem } from '../models/stock-item.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-stock-issue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './stock-issue.component.html',
  styleUrls: ['./stock-issue.component.scss']
})
export class StockIssueComponent implements OnInit {
  issueForm: FormGroup;
  stockItems: StockItem[] = [];

  constructor(private fb: FormBuilder, private stockService: StockService) { }

  ngOnInit(): void {
    this.issueForm = this.fb.group({
      itemCode: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]]
    });

    this.stockService.getStockItems().subscribe(items => {
      this.stockItems = items;
    });
  }

  onSubmit() {
    if (this.issueForm.valid) {
      const { itemCode, quantity } = this.issueForm.value;
      this.stockService.issueStock(itemCode, quantity);
      // TODO: Add navigation or success message
    }
  }
}
