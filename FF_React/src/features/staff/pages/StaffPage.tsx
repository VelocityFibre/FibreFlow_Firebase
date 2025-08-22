import { useState } from 'react';
import { PageHeader } from '@shared/components';
import { Plus, Search, Filter, Edit2, Trash2, Mail, Phone } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  joinDate: string;
}

// Mock data
const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@fibreflow.com',
    phone: '+27 11 123 4567',
    role: 'Project Manager',
    department: 'Engineering',
    status: 'active',
    joinDate: '2023-01-15'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@fibreflow.com',
    phone: '+27 21 987 6543',
    role: 'Field Technician',
    department: 'Operations',
    status: 'active',
    joinDate: '2023-03-10'
  },
  {
    id: '3',
    name: 'Mike Wilson',
    email: 'mike.wilson@fibreflow.com',
    phone: '+27 31 555 1234',
    role: 'Stock Manager',
    department: 'Logistics',
    status: 'inactive',
    joinDate: '2022-09-05'
  }
];

export function StaffPage() {
  const [staff] = useState<Staff[]>(mockStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const departments = ['all', 'Engineering', 'Operations', 'Logistics', 'Administration'];

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Staff Management"
        description="Manage your team members and their roles"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Add Staff Member
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search staff members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <div key={member.id} className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-muted-foreground text-sm">{member.role}</p>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded mt-1 inline-block">
                  {member.department}
                </span>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                member.status === 'active' 
                  ? 'bg-success/10 text-success' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {member.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone size={14} />
                <span>{member.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded transition-colors">
                <Edit2 size={12} />
                Edit
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors">
                <Trash2 size={12} />
                Remove
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Joined {new Date(member.joinDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No staff members found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}