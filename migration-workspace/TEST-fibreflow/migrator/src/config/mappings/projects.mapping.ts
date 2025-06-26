import { TableMapping } from '../../models/types';
import { TransformationService } from '../../services/transformation.service';

export const projectsMapping: TableMapping = {
  airtableTable: 'Projects',
  airtableTableId: 'tblXq0RpqQRAjoIe0',
  firebaseCollection: 'projects',
  fieldMappings: [
    // Basic Information
    {
      airtableField: 'Project Name',
      airtableFieldId: 'fldCkRSwvmtDoYoo1',
      firebaseField: 'name',
      dataType: 'text',
      required: true
    },
    {
      airtableField: 'Status',
      airtableFieldId: 'fldOh9EEk8AngwLpD',
      firebaseField: 'status',
      dataType: 'text',
      transform: (value) => (value || 'Not Started').toLowerCase().replace(/\s+/g, '_')
    },
    {
      airtableField: 'Region',
      airtableFieldId: 'fldKLLcreL05pDooH',
      firebaseField: 'region',
      dataType: 'text'
    },
    
    // Dates
    {
      airtableField: 'Start Date',
      airtableFieldId: 'flddF1Vtt1c2HO9hU',
      firebaseField: 'dates.start',
      dataType: 'date'
    },
    {
      airtableField: 'Project Duration Mths',
      airtableFieldId: 'fldvGJJhCBxdUCIea',
      firebaseField: 'dates.durationMonths',
      dataType: 'number',
      defaultValue: 0
    },
    
    // BOQ (Bill of Quantities)
    {
      airtableField: 'Total Homes PO',
      airtableFieldId: 'fldWFeOQ4TN4zEyb5',
      firebaseField: 'boq.totalHomes',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Pole Permissions BOQ',
      airtableFieldId: 'fldf4Tf7eHuTD0FfM',
      firebaseField: 'boq.polePermissions',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Poles to Plant BOQ',
      airtableFieldId: 'fldfCJIpvUyfo8v0E',
      firebaseField: 'boq.polesToPlant',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Trenching BOQ',
      airtableFieldId: 'fldQHVENBnhiuO3rA',
      firebaseField: 'boq.trenching',
      dataType: 'number',
      defaultValue: 0
    },
    
    // Progress Metrics (from rollups)
    {
      airtableField: 'Permissions Complete',
      airtableFieldId: 'fldPS9N80WKQqxNOL',
      firebaseField: 'progress.permissions.complete',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Poles Planted',
      airtableFieldId: 'fldXuBW2xuKKHp2nl',
      firebaseField: 'progress.poles.planted',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Home Sign-ups',
      airtableFieldId: 'fldOS96iGowvx9RPJ',
      firebaseField: 'progress.homes.signups',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Home Drops',
      airtableFieldId: 'fldk1VygAlA74lpud',
      firebaseField: 'progress.homes.drops',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Homes Connected',
      airtableFieldId: 'fldG6IwUcf709xGcY',
      firebaseField: 'progress.homes.connected',
      dataType: 'number',
      defaultValue: 0
    },
    
    // SHEQ Status
    {
      airtableField: 'SHEQ Status',
      airtableFieldId: 'fldVLnn1pLHjg5OSq',
      firebaseField: 'sheqStatus',
      dataType: 'text',
      transform: (value) => (value || 'pending').toLowerCase()
    }
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Customer',
      airtableFieldId: 'fldStpnIz7Pvh6kZX',
      targetCollection: 'customers',
      denormalize: true,
      denormalizedFields: ['name']
    },
    {
      type: 'many-to-one',
      airtableField: 'Province',
      airtableFieldId: 'fldQql48fTLQLOIa2',
      targetCollection: 'provinces',
      denormalize: true,
      denormalizedFields: ['name']
    },
    {
      type: 'many-to-one',
      airtableField: 'Regional PM',
      airtableFieldId: 'fldZeRzHNh8V2tHnK',
      targetCollection: 'staff',
      denormalize: true,
      denormalizedFields: ['name']
    },
    {
      type: 'many-to-one',
      airtableField: 'Project Manager',
      airtableFieldId: 'fldf4LJWp8NUwKXi3',
      targetCollection: 'staff',
      denormalize: true,
      denormalizedFields: ['name']
    }
  ],
  calculatedFields: [
    {
      name: 'dates.end',
      formula: 'startDate + durationMonths',
      dependencies: ['dates.start', 'dates.durationMonths'],
      calculate: (record) => {
        if (record.dates?.start && record.dates?.durationMonths) {
          const start = new Date(record.dates.start);
          const end = new Date(start);
          end.setMonth(end.getMonth() + record.dates.durationMonths);
          return end;
        }
        return null;
      }
    }
  ],
  skipFields: [
    'AI Summary',
    'Next Steps Recommendation',
    'Auto Project Status'
  ]
};