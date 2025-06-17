import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Feature routes
import { boqManagementRoutes } from './boq-management.routes';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(boqManagementRoutes)],
})
export class BOQManagementModule {}
