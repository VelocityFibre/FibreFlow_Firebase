import { TableMapping } from '../../models/types';

export const staffMapping: TableMapping = {
  airtableTable: 'Staff',
  airtableTableId: 'tblJKVbss1eljnAWB',
  firebaseCollection: 'staff',
  fieldMappings: [
    {
      airtableField: 'Name',
      airtableFieldId: 'fldSJvRE40J8xJGBH',
      firebaseField: 'name',
      dataType: 'text',
      required: true
    }
    // TODO: Add remaining field mappings
  ],
  relationships: []
};