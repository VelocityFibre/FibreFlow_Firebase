import { BaseFirestoreService } from './firebase/base.service';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  joinDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StaffService extends BaseFirestoreService<Staff> {
  constructor() {
    super('staff');
  }

  // Get active staff members
  async getActiveStaff(): Promise<Staff[]> {
    return this.findByField('status', 'active');
  }

  // Get staff by department
  async getByDepartment(department: string): Promise<Staff[]> {
    return this.findByField('department', department);
  }

  // Search staff by name or email
  async search(searchTerm: string): Promise<Staff[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simplified implementation - in production you might use Algolia
    const allStaff = await this.getAll();
    return allStaff.filter(staff => 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Deactivate staff member instead of deleting
  async deactivate(id: string): Promise<void> {
    await this.update(id, { status: 'inactive' });
  }

  // Reactivate staff member
  async activate(id: string): Promise<void> {
    await this.update(id, { status: 'active' });
  }
}

// Export singleton instance
export const staffService = new StaffService();