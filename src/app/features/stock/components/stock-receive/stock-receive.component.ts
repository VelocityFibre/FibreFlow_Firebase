
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
  selector: 'app-stock-receive',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './stock-receive.component.html',
  styleUrls: ['./stock-receive.component.scss']
})
export class StockReceiveComponent implements OnInit {
  receiveForm: FormGroup;
  stockItems: StockItem[] = [];

  constructor(private fb: FormBuilder, private stockService: StockService) { }

  ngOnInit(): void {
    this.receiveForm = this.fb.group({
      itemCode: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      location: [''],
      batchNumber: ['']
    });

    this.stockService.getStockItems().subscribe(items => {
      this.stockItems = items;
    });
  }

  onSubmit() {
    if (this.receiveForm.valid) {
      const { itemCode, quantity } = this.receiveForm.value;
      this.stockService.receiveStock(itemCode, quantity);
      // TODO: Add navigation or success message
    }
  }
}
