import Airtable, { Base, Table } from 'airtable';
import { AirtableRecord } from '../models/types';
import chalk from 'chalk';

export class AirtableService {
  private base: Base;
  
  constructor(apiKey: string, baseId: string) {
    Airtable.configure({ apiKey });
    this.base = Airtable.base(baseId);
  }
  
  async fetchAllRecords(
    tableName: string,
    options: {
      fields?: string[];
      filterByFormula?: string;
      sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
      maxRecords?: number;
      pageSize?: number;
      modifiedAfter?: Date;
    } = {}
  ): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    const { fields, filterByFormula, sort, maxRecords, pageSize = 100, modifiedAfter } = options;
    
    let formula = filterByFormula || '';
    if (modifiedAfter) {
      const dateStr = modifiedAfter.toISOString();
      const modifiedFormula = `LAST_MODIFIED_TIME() >= '${dateStr}'`;
      formula = formula ? `AND(${formula}, ${modifiedFormula})` : modifiedFormula;
    }
    
    const selectOptions: any = {
      pageSize,
      ...(fields && { fields }),
      ...(formula && { filterByFormula: formula }),
      ...(sort && { sort }),
      ...(maxRecords && { maxRecords })
    };
    
    console.log(chalk.blue(`Fetching records from ${tableName}...`));
    
    return new Promise((resolve, reject) => {
      const recordList: AirtableRecord[] = [];
      
      this.base(tableName)
        .select(selectOptions)
        .eachPage(
          (pageRecords, fetchNextPage) => {
            const pageData = pageRecords.map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime
            }));
            
            recordList.push(...pageData);
            console.log(chalk.gray(`  Fetched ${recordList.length} records so far...`));
            
            fetchNextPage();
          },
          (err) => {
            if (err) {
              console.error(chalk.red(`Error fetching records: ${err.message}`));
              reject(err);
            } else {
              console.log(chalk.green(`✓ Fetched ${recordList.length} total records from ${tableName}`));
              resolve(recordList);
            }
          }
        );
    });
  }
  
  async fetchRecordById(tableName: string, recordId: string): Promise<AirtableRecord | null> {
    try {
      const record = await this.base(tableName).find(recordId);
      return {
        id: record.id,
        fields: record.fields,
        createdTime: record._rawJson.createdTime
      };
    } catch (error) {
      console.error(chalk.red(`Error fetching record ${recordId}: ${error}`));
      return null;
    }
  }
  
  async getTableSchema(tableId: string): Promise<any> {
    // This would use the Metadata API if available
    // For now, we'll use the pre-fetched schema
    console.log(chalk.yellow('Using pre-fetched schema data'));
    return null;
  }
}