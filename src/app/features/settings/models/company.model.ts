export interface CompanyInfo {
  id?: string;
  companyName: string;
  tradingName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  website?: string;

  // Address Information
  physicalAddress: {
    street: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };

  postalAddress?: {
    street: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };

  // Banking Information
  bankingDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
    swiftCode?: string;
  };

  // Company Logo
  logoUrl?: string;

  // Additional Settings
  fiscalYearEnd?: string;
  currency?: string;
  timezone?: string;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
}

export const DEFAULT_COMPANY_INFO: Partial<CompanyInfo> = {
  companyName: 'Velocity Fibre',
  currency: 'ZAR',
  timezone: 'Africa/Johannesburg',
  physicalAddress: {
    street: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
  },
};
