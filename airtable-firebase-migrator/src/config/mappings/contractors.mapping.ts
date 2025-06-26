import { TableMapping } from '../../models/types';

export const contractorsMapping: TableMapping = {
  airtableTable: 'Contractors',
  airtableTableId: 'tbl4UwjKR0VcrXYdS',
  firebaseCollection: 'contractors',
  fieldMappings: [
    {
      airtableField: 'Company Registered Name',
      airtableFieldId: 'fldCqPiXC6mT2IY6M',
      firebaseField: 'companyName',
      dataType: 'text',
      required: true
    }
    // TODO: Add remaining field mappings
  ],
  relationships: []
};