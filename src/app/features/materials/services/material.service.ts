import { Injectable } from '@angular/core';
import { MasterMaterial } from '../models/material.model';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {

  constructor() { }

  // TODO: Implement Firestore service

  getMaterials() {
    // Placeholder
    return [];
  }

  addMaterial(material: MasterMaterial) {
    // Placeholder
  }

  updateMaterial(material: MasterMaterial) {
    // Placeholder
  }

  deleteMaterial(id: string) {
    // Placeholder
  }
}