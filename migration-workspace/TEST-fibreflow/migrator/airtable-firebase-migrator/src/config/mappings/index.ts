import { TableMapping } from '../../models/types';
import { customersMapping } from './customers.mapping';
import { projectsMapping } from './projects.mapping';
import { dailyTrackerMapping } from './daily-tracker.mapping';
import { staffMapping } from './staff.mapping';
import { contractorsMapping } from './contractors.mapping';

export const tableMappings = new Map<string, TableMapping>([
  ['customers', customersMapping],
  ['projects', projectsMapping],
  ['daily-tracker', dailyTrackerMapping],
  ['staff', staffMapping],
  ['contractors', contractorsMapping]
]);

export function getMapping(tableName: string): TableMapping | undefined {
  return tableMappings.get(tableName.toLowerCase());
}

export const migrationOrder = [
  'staff',
  'contractors', 
  'customers',
  'projects',
  'daily-tracker'
];