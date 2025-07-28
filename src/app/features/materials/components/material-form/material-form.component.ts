
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialService } from '../../services/material.service';
import { MasterMaterial } from '../../models/material.model';
import { materialCategories } from '../../models/material-categories';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-material-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './material-form.component.html',
  styleUrls: ['./material-form.component.scss']
})
export class MaterialFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private materialService = inject(MaterialService);
  
  materialForm!: FormGroup;
  categories = materialCategories;

  ngOnInit(): void {
    this.materialForm = this.fb.group({
      itemCode: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      subcategory: [''],
      unitOfMeasure: ['', Validators.required],
      unitCost: ['', Validators.required],
      defaultSpoolLength: [''],
      supplierId: [''],
      specifications: [''],
      minimumStock: ['']
    });
  }

  onSubmit() {
    if (this.materialForm.valid) {
      const newMaterial: MasterMaterial = {
        ...this.materialForm.value,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.materialService.addMaterial(newMaterial);
      // TODO: Add navigation back to the list
    }
  }
}
