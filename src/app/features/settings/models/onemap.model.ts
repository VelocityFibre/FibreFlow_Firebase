export interface OneMapRecord {
  propertyId: string;
  oneMapNadId: string;
  poleNumber: string;
  dropNumber: string;
  status: string;
  flowNameGroups: string;
  sections: string;
  pons: string;
  location: string;
  address: string;
  fieldAgentName: string;
  lastModifiedBy: string;
  lastModifiedDate: string;
}

export interface ProcessedOneMapData {
  firstEntryRecords: OneMapRecord[];
  duplicatesPreWindow: OneMapRecord[];
  noDropAllocated: OneMapRecord[];
  duplicateDropsRemoved: OneMapRecord[];
}

export interface OneMapProcessingConfig {
  startDate: Date;
  endDate: Date;
}
