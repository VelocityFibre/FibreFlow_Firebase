import { TableMapping } from '../../models/types';

export const projectsMapping: TableMapping = {
  airtableTable: 'Projects',
  airtableTableId: 'tblXq0RpqQRAjoIe0',
  firebaseCollection: 'projects',
  fieldMappings: [
    {
      airtableField: 'Project Name',
      airtableFieldId: 'fldCkRSwvmtDoYoo1',
      firebaseField: 'name',
      dataType: 'text',
      required: true
    }
    // TODO: Add all other field mappings from the plan
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Customer',
      airtableFieldId: 'fldStpnIz7Pvh6kZX',
      targetCollection: 'customers',
      denormalize: true
    }
    // TODO: Add other relationships
  ]
};