import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { catchError, of } from 'rxjs';

import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { SupplierContact } from '../../../../core/suppliers/models/supplier-contact.model';
import { Supplier } from '../../../../core/suppliers/models/supplier.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-supplier-contacts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './supplier-contacts.component.html',
  styleUrls: ['./supplier-contacts.component.scss'],
})
export class SupplierContactsComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // State
  supplierId = '';
  loading = signal(true);
  searchTerm = signal('');
  searchValue = '';

  // Data signals
  supplier = signal<Supplier | undefined>(undefined);
  contacts = signal<SupplierContact[]>([]);

  // Computed filtered contacts
  filteredContacts = computed(() => {
    const allContacts = this.contacts();
    const search = this.searchTerm().toLowerCase();

    if (!search) return allContacts;

    return allContacts.filter((contact) => {
      const nameMatch = contact.name && contact.name.toLowerCase().includes(search);
      const positionMatch = contact.position && contact.position.toLowerCase().includes(search);
      const emailMatch = contact.email && contact.email.toLowerCase().includes(search);
      const phoneMatch = contact.phone && contact.phone.includes(search);

      return nameMatch || positionMatch || emailMatch || phoneMatch;
    });
  });

  // Contact stats
  contactStats = computed(() => {
    const allContacts = this.contacts();
    return {
      total: allContacts.length,
      primary: allContacts.filter((c) => c.isPrimary).length,
      withPortalAccess: allContacts.filter((c) => c.canAccessPortal).length,
    };
  });

  // Table columns
  displayedColumns = ['name', 'position', 'email', 'phone', 'status', 'actions'];

  ngOnInit() {
    // Get supplier ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notification.error('Supplier ID not found');
      this.router.navigate(['/suppliers']);
      return;
    }

    this.supplierId = id;
    this.loadData();
  }

  private loadData() {
    // Load supplier info
    this.supplierService
      .getSupplierById(this.supplierId)
      .pipe(
        catchError((err) => {
          console.error('Error loading supplier:', err);
          return of(undefined);
        }),
      )
      .subscribe((supplier) => {
        this.supplier.set(supplier);
      });

    // Load contacts
    this.supplierService
      .getSupplierContacts(this.supplierId)
      .pipe(
        catchError((err) => {
          console.error('Error loading contacts:', err);
          return of([]);
        }),
      )
      .subscribe((contacts) => {
        this.contacts.set(contacts);
        this.loading.set(false);
      });
  }

  onSearchChange(value: string) {
    this.searchValue = value;
    this.searchTerm.set(value);
  }

  async addContact() {
    const name = prompt('Enter contact name:');
    if (!name) return;

    const position = prompt('Enter position:');
    if (!position) return;

    const email = prompt('Enter email:');
    if (!email) return;

    const phone = prompt('Enter phone:');
    if (!phone) return;

    const isPrimary = confirm('Set as primary contact?');
    const canAccessPortal = confirm('Grant portal access?');

    try {
      await this.supplierService.addContact(this.supplierId, {
        supplierId: this.supplierId,
        name,
        position,
        email,
        phone,
        isPrimary,
        canAccessPortal,
      });
      this.notification.success('Contact added successfully');
      this.loadData(); // Refresh
    } catch (error) {
      this.notification.error('Failed to add contact');
      console.error('Error adding contact:', error);
    }
  }

  async editContact(contact: SupplierContact) {
    const name = prompt('Enter contact name:', contact.name);
    if (!name) return;

    const position = prompt('Enter position:', contact.position);
    if (!position) return;

    const email = prompt('Enter email:', contact.email);
    if (!email) return;

    const phone = prompt('Enter phone:', contact.phone);
    if (!phone) return;

    if (!contact.id) return;

    try {
      await this.supplierService.updateContact(this.supplierId, contact.id, {
        name,
        position,
        email,
        phone,
      });
      this.notification.success('Contact updated successfully');
      this.loadData(); // Refresh
    } catch (error) {
      this.notification.error('Failed to update contact');
      console.error('Error updating contact:', error);
    }
  }

  async deleteContact(contact: SupplierContact) {
    if (!contact.id) return;

    const confirmed = confirm(`Are you sure you want to delete ${contact.name}?`);
    if (!confirmed) return;

    try {
      await this.supplierService.deleteContact(this.supplierId, contact.id);
      this.notification.success('Contact deleted successfully');
      this.loadData(); // Refresh
    } catch (error) {
      this.notification.error('Failed to delete contact');
      console.error('Error deleting contact:', error);
    }
  }

  async togglePrimaryContact(contact: SupplierContact) {
    if (!contact.id) return;

    try {
      // If setting as primary, remove primary status from other contacts
      if (!contact.isPrimary) {
        const currentPrimary = this.contacts().find((c) => c.isPrimary && c.id !== contact.id);
        if (currentPrimary?.id) {
          await this.supplierService.updateContact(this.supplierId, currentPrimary.id, {
            isPrimary: false,
          });
        }
      }

      await this.supplierService.updateContact(this.supplierId, contact.id, {
        isPrimary: !contact.isPrimary,
      });

      this.notification.success(
        contact.isPrimary ? 'Removed as primary contact' : 'Set as primary contact',
      );
      this.loadData(); // Refresh
    } catch (error) {
      this.notification.error('Failed to update contact status');
      console.error('Error updating contact:', error);
    }
  }

  async togglePortalAccess(contact: SupplierContact) {
    if (!contact.id) return;

    try {
      await this.supplierService.updateContact(this.supplierId, contact.id, {
        canAccessPortal: !contact.canAccessPortal,
      });

      this.notification.success(
        contact.canAccessPortal ? 'Portal access revoked' : 'Portal access granted',
      );
      this.loadData(); // Refresh
    } catch (error) {
      this.notification.error('Failed to update portal access');
      console.error('Error updating portal access:', error);
    }
  }

  goBackToSupplier() {
    this.router.navigate(['/suppliers', this.supplierId]);
  }

  getStatusChips(contact: SupplierContact): Array<{ label: string; class: string }> {
    const chips = [];

    if (contact.isPrimary) {
      chips.push({ label: 'Primary', class: 'primary-chip' });
    }

    if (contact.canAccessPortal) {
      chips.push({ label: 'Portal Access', class: 'access-chip' });
    }

    return chips;
  }
}
