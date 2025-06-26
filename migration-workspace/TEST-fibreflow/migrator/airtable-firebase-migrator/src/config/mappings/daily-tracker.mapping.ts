import { TableMapping } from '../../models/types';

export const dailyTrackerMapping: TableMapping = {
  airtableTable: 'Daily Tracker',
  airtableTableId: 'tblkw4um87urFNtrd',
  firebaseCollection: 'dailyProgress',
  subcollectionOf: 'projects',
  fieldMappings: [
    {
      airtableField: 'Date',
      airtableFieldId: 'fldTGwYfWdD0MBaVE',
      firebaseField: 'date',
      dataType: 'date',
      required: true
    }
    // TODO: Add remaining field mappings
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Project',
      airtableFieldId: 'fldq5kUpEu8P0sSFA',
      targetCollection: 'projects',
      denormalize: true
    }
  ]
};