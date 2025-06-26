import { TableMapping } from '../../models/types';

export const staffMapping: TableMapping = {
  airtableTable: 'Staff',
  airtableTableId: 'tblJKVbss1eljnAWB',
  firebaseCollection: 'staff',
  fieldMappings: [
    {
      airtableField: 'Name',
      airtableFieldId: 'flddmVKP0DPeYvnPU',
      firebaseField: 'name',
      dataType: 'text',
      required: true
    },
    {
      airtableField: 'Role',
      airtableFieldId: 'fldsnLuIBgysfh29X',
      firebaseField: 'role',
      dataType: 'text',
      transform: (value) => (value || '').toLowerCase().replace(/\s+/g, '_')
    },
    {
      airtableField: 'Phone Number',
      airtableFieldId: 'fldbCov30BOaD9bUH',
      firebaseField: 'phone',
      dataType: 'text'
    },
    {
      airtableField: 'Email',
      airtableFieldId: 'fldjbOrR8CrihHSYr',
      firebaseField: 'email',
      dataType: 'text'
    },
    {
      airtableField: 'Total Assigned Projects',
      airtableFieldId: 'fldcrWBH05U78wDpN',
      firebaseField: 'stats.totalProjects',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Photo',
      airtableFieldId: 'fldWSuVFFqJ7I6Bzv',
      firebaseField: 'photoUrls',
      dataType: 'array',
      transform: (value) => {
        if (!value || !Array.isArray(value)) return [];
        return value.map(attachment => attachment.url);
      }
    }
  ],
  relationships: [
    {
      type: 'one-to-many',
      airtableField: 'Assigned Projects',
      airtableFieldId: 'fldWagcgsb7Ao5BsE',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Projects 2',
      airtableFieldId: 'fldRAQdrdb3c5eMil',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'SHEQ',
      airtableFieldId: 'fldRuDQete3715Epn',
      targetCollection: 'sheq',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Issues and Risks',
      airtableFieldId: 'fldynYm1lUyhy2eiR',
      targetCollection: 'issuesAndRisks',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Contacts',
      airtableFieldId: 'fldi2IDiivJ9oBxSZ',
      targetCollection: 'contacts',
      denormalize: false
    }
  ],
  skipFields: [
    'Role Summary', // AI-generated
    'Project Management Insights', // AI-generated
    'Current Projects', // Rollup field
    'Phases',
    'Projects',
    'Tasks (Assigned To)',
    'Tasks (Reported By)',
    'Stock Movements',
    'Contractor On-Boarding',
    'Poles Lawley',
    'Lawley Pole Tracker copy'
  ]
};