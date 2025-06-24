import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ContractorService } from '../../services/contractor.service';
import { Contractor, ContractorStatus } from '../../models/contractor.model';

@Component({
  selector: 'app-contractor-import',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatDialogModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Import Contractors</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Click the button below to import the predefined contractors from the Excel screenshot.</p>
        <p>This will create 12 contractors with their registration details and contact information.</p>
      </mat-card-content>
      <mat-card-actions>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="importContractors()"
          [disabled]="importing"
        >
          <mat-spinner *ngIf="importing" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
          {{ importing ? 'Importing...' : 'Import Contractors' }}
        </button>
        <button mat-button (click)="dialogRef.close()" [disabled]="importing">Cancel</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-width: 600px;
      margin: 20px auto;
    }
    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class ContractorImportComponent {
  private contractorService = inject(ContractorService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ContractorImportComponent>);
  
  importing = false;

  // Contractor data from the screenshot - simplified for compatibility
  private contractorData: any[] = [
    {
      companyName: 'CMC',
      tradingName: 'CMC',
      registrationNumber: '2004/112183/23',
      vatNumber: '4050222928',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'CMC Contact',
        email: 'info@cmc.co.za',
        phone: '011 123 4567',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 4,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Elevate',
      tradingName: 'Elevate',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Elevate Contact',
        email: 'info@elevate.co.za',
        phone: '011 234 5678',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 4,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Mafemani Lettle Nwamac',
      tradingName: 'Mafemani',
      registrationNumber: '2021/320682/07',
      vatNumber: '4940319975',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Mafemani Contact',
        email: 'info@mafemani.co.za',
        phone: '011 345 6789',
        position: 'Manager'
      },
      physicalAddress: {
        street: '108 Chris Hani Rd, PO Chiawelo Extension 1',
        city: 'Soweto',
        province: 'Gauteng',
        postalCode: '1818'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Al-Ragman Projects',
      tradingName: 'Al-Ragman Projects',
      registrationNumber: '2015/249699/07',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Al-Ragman Contact',
        email: 'info@alragman.co.za',
        phone: '011 456 7890',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 2,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Tumi Hirele Trading',
      tradingName: 'Tumi Hirele Trading',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Tumi Contact',
        email: 'info@tumihirele.co.za',
        phone: '011 567 8901',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'MKB AUTHENTIC PROJECTS',
      tradingName: 'MKB AUTHENTIC PROJECTS',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'MKB Contact',
        email: 'info@mkbprojects.co.za',
        phone: '011 678 9012',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Good hope security & Civil',
      tradingName: 'Good hope security & Civil',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Good Hope Contact',
        email: 'info@goodhope.co.za',
        phone: '011 789 0123',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 2,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'K2022530475(South Africa)',
      tradingName: 'K2022530475(South Africa)',
      registrationNumber: 'K2022530475',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'K2022 Contact',
        email: 'info@k2022.co.za',
        phone: '011 890 1234',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Magraet Kondile Cleaning',
      tradingName: 'Magraet Kondile Cleaning',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Magraet Contact',
        email: 'info@mkclean.co.za',
        phone: '011 901 2345',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Zizwe',
      tradingName: 'Zizwe',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Zizwe Contact',
        email: 'info@zizwe.co.za',
        phone: '011 012 3456',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Kosetlamamotho (PTY) Ltd',
      tradingName: 'Kosetlamamotho (PTY) Ltd',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Kosetlamamotho Contact',
        email: 'info@kosetlamamotho.co.za',
        phone: '011 123 4567',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 2,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    },
    {
      companyName: 'Sanzas Supplier',
      tradingName: 'Sanzas Supplier',
      registrationNumber: '',
      vatNumber: '',
      status: 'active' as ContractorStatus,
      contactPerson: {
        name: 'Sanzas Contact',
        email: 'info@sanzas.co.za',
        phone: '011 234 5678',
        position: 'Manager'
      },
      physicalAddress: {
        street: '',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2000'
      },
      capabilities: {
        services: [],
        maxTeams: 5,
        equipment: [],
        certifications: []
      },
      compliance: {
        bbbeeLevel: 1,
        safetyRating: 4
      },
      financial: {
        bankName: '',
        accountNumber: '',
        branchCode: '',
        accountType: 'current',
        paymentTerms: 30
      },
      teams: []
    }
  ];

  async importContractors() {
    this.importing = true;
    let successCount = 0;

    try {
      console.log('Creating contractors...');
      for (const contractor of this.contractorData) {
        try {
          await this.contractorService.createContractor(contractor);
          successCount++;
          console.log(`✓ Contractor created: ${contractor.companyName}`);
        } catch (error) {
          console.error(`Failed to create contractor ${contractor.companyName}:`, error);
        }
      }

      this.snackBar.open(
        `Import completed! Created ${successCount} contractors.`,
        'Close',
        { duration: 5000 }
      );
      
      // Close dialog on success
      this.dialogRef.close(true);

    } catch (error) {
      console.error('Import error:', error);
      this.snackBar.open(
        'Error during import. Check console for details.',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.importing = false;
    }
  }
}