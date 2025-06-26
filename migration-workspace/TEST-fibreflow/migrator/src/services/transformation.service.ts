import { 
  AirtableRecord, 
  FirebaseDocument, 
  TableMapping, 
  FieldMapping,
  RelationshipMapping 
} from '../models/types';
import chalk from 'chalk';

export class TransformationService {
  private relationshipCache: Map<string, any> = new Map();
  
  async transformRecord(
    record: AirtableRecord,
    mapping: TableMapping
  ): Promise<FirebaseDocument> {
    const transformed: FirebaseDocument = {
      airtableId: record.id,
      createdAt: new Date(record.createdTime),
      updatedAt: new Date()
    };
    
    // Transform fields
    for (const fieldMapping of mapping.fieldMappings) {
      const value = record.fields[fieldMapping.airtableField];
      
      if (value !== undefined && value !== null && value !== '') {
        try {
          const transformedValue = await this.transformField(value, fieldMapping);
          this.setNestedProperty(transformed, fieldMapping.firebaseField, transformedValue);
        } catch (error) {
          console.error(chalk.red(`Error transforming field ${fieldMapping.airtableField}:`, error));
          if (fieldMapping.required) {
            throw error;
          }
        }
      } else if (fieldMapping.defaultValue !== undefined) {
        this.setNestedProperty(transformed, fieldMapping.firebaseField, fieldMapping.defaultValue);
      }
    }
    
    // Handle calculated fields
    if (mapping.calculatedFields) {
      for (const calc of mapping.calculatedFields) {
        try {
          const value = calc.calculate(transformed);
          this.setNestedProperty(transformed, calc.name, value);
        } catch (error) {
          console.error(chalk.red(`Error calculating field ${calc.name}:`, error));
        }
      }
    }
    
    return transformed;
  }
  
  async transformBatch(
    records: AirtableRecord[],
    mapping: TableMapping
  ): Promise<FirebaseDocument[]> {
    const transformed: FirebaseDocument[] = [];
    
    for (const record of records) {
      try {
        const doc = await this.transformRecord(record, mapping);
        transformed.push(doc);
      } catch (error) {
        console.error(chalk.red(`Failed to transform record ${record.id}:`, error));
      }
    }
    
    return transformed;
  }
  
  private async transformField(value: any, fieldMapping: FieldMapping): Promise<any> {
    // Apply custom transform if provided
    if (fieldMapping.transform) {
      value = fieldMapping.transform(value);
    }
    
    // Type conversion based on dataType
    switch (fieldMapping.dataType) {
      case 'text':
        return String(value);
        
      case 'number':
        return Number(value) || 0;
        
      case 'boolean':
        return Boolean(value);
        
      case 'date':
      case 'timestamp':
        if (value) {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
        
      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          return value.split(',').map(s => s.trim());
        }
        return [];
        
      case 'object':
        if (typeof value === 'object') {
          return value;
        }
        try {
          return JSON.parse(value);
        } catch {
          return { raw: value };
        }
        
      default:
        return value;
    }
  }
  
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  // Helper transformations
  static parseContactInfo(text: string): any {
    const lines = (text || '').split('\n').filter(l => l.trim());
    const info: any = { address: '' };
    
    lines.forEach(line => {
      if (line.includes('@')) {
        info.email = line.trim();
      } else if (line.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)) {
        info.phone = line.trim();
      } else {
        info.address += (info.address ? '\n' : '') + line.trim();
      }
    });
    
    return info;
  }
  
  static parseBankingDetails(text: string): any {
    const lines = (text || '').split('\n').filter(l => l.trim());
    const details: any = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        const fieldName = key.toLowerCase().replace(/\s+/g, '');
        details[fieldName] = value;
      }
    });
    
    return details;
  }
  
  static calculatePercentage(complete: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((complete / total) * 100) / 100;
  }
}