import { TableMapping } from '../../models/types';
import { TransformationService } from '../../services/transformation.service';

export const customersMapping: TableMapping = {
  airtableTable: 'Customers',
  airtableTableId: 'tblBgVlK9uNmh71TV',
  firebaseCollection: 'customers',
  fieldMappings: [
    {
      airtableField: 'Client Name',
      airtableFieldId: 'fldAb7I9YEr6TOM9v',
      firebaseField: 'name',
      dataType: 'text',
      required: true
    },
    {
      airtableField: 'Client Type',
      airtableFieldId: 'fldEmBJuxYviRaYJY',
      firebaseField: 'type',
      dataType: 'text',
      transform: (value) => (value || '').toLowerCase().replace(/\s+/g, '_')
    },
    {
      airtableField: 'Contact Information',
      airtableFieldId: 'fldpble83gk8cEESr',
      firebaseField: 'contactInfo',
      dataType: 'object',
      transform: TransformationService.parseContactInfo
    },
    {
      airtableField: 'SLA Terms',
      airtableFieldId: 'fldyBkc5LOlURma8y',
      firebaseField: 'slaTerms',
      dataType: 'text'
    },
    {
      airtableField: 'Total Projects',
      airtableFieldId: 'fldL4yq41QPoGAbAa',
      firebaseField: 'stats.totalProjects',
      dataType: 'number',
      defaultValue: 0
    },
    {
      airtableField: 'Active Projects',
      airtableFieldId: 'fldL5a9V8xKIzvBmT',
      firebaseField: 'stats.activeProjects',
      dataType: 'number',
      defaultValue: 0
    }
  ],
  relationships: [
    {
      type: 'one-to-many',
      airtableField: 'Assigned Projects',
      airtableFieldId: 'fldKwyqnFSN9XtnZF',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'WIP Projects',
      airtableFieldId: 'fld1HKan24bNxYZLs',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Contacts',
      airtableFieldId: 'fld1ON92phAwKc35O',
      targetCollection: 'contacts',
      denormalize: false
    }
  ],
  skipFields: [
    'Client Summary',
    'Next Action Recommendation'
  ]
};