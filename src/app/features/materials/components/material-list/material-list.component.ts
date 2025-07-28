import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialService } from '../../services/material.service';
import { MasterMaterial } from '../../models/material.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './material-list.component.html',
  styleUrls: ['./material-list.component.scss']
})
export class MaterialListComponent implements OnInit {
  materials: MasterMaterial[] = [];
  displayedColumns: string[] = ['itemCode', 'description', 'category', 'unitOfMeasure', 'unitCost', 'actions'];

  constructor(private materialService: MaterialService) { }

  ngOnInit(): void {
    this.materials = this.materialService.getMaterials();
  }

  addMaterial() {
    // TODO: Implement add functionality
  }

  editMaterial(material: MasterMaterial) {
    // TODO: Implement edit functionality
  }

  deleteMaterial(material: MasterMaterial) {
    // TODO: Implement delete functionality
  }
}