import Airtable, { Base } from 'airtable';
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
      retryAttempts?: number;
      retryDelay?: number;
    } = {}
  ): Promise<AirtableRecord[]> {
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
    
    // Add retry logic
    const maxRetries = options.retryAttempts || 3;
    const retryDelay = options.retryDelay || 5000; // 5 seconds
    
    const fetchWithRetry = async (attempt: number = 1): Promise<AirtableRecord[]> => {
      try {
        return await new Promise((resolve, reject) => {
          const recordList: AirtableRecord[] = [];
          let hasError = false;
          
          const timeoutId = setTimeout(() => {
            hasError = true;
            reject(new Error('Request timeout after 30 seconds'));
          }, 30000); // 30 second timeout
          
          this.base(tableName)
            .select(selectOptions)
            .eachPage(
              (pageRecords, fetchNextPage) => {
                if (hasError) return;
                
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
                clearTimeout(timeoutId);
                
                if (err) {
                  if (!hasError) {
                    console.error(chalk.red(`Error fetching records: ${err.message}`));
                    reject(err);
                  }
                } else {
                  console.log(chalk.green(`✓ Fetched ${recordList.length} total records from ${tableName}`));
                  resolve(recordList);
                }
              }
            );
        });
      } catch (error: any) {
        if (attempt < maxRetries) {
          console.log(chalk.yellow(`⚠️  Network error, retrying in ${retryDelay/1000} seconds... (attempt ${attempt}/${maxRetries})`));
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchWithRetry(attempt + 1);
        } else {
          console.error(chalk.red(`Failed after ${maxRetries} attempts`));
          throw error;
        }
      }
    };
    
    return fetchWithRetry();
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
  
  async getTableSchema(_tableId: string): Promise<any> {
    // This would use the Metadata API if available
    // For now, we'll use the pre-fetched schema
    console.log(chalk.yellow('Using pre-fetched schema data'));
    return null;
  }
}