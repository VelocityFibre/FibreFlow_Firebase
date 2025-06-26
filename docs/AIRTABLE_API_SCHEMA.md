# Velocity Fibre Management - Airtable API Schema

## Base Information
- **Base ID**: `appkYMgaK0cHVu4Zg`
- **Base Name**: Velocity Fibre Management
- **API Endpoint**: `https://api.airtable.com/v0/appkYMgaK0cHVu4Zg`

## Authentication
- **Method**: Bearer Token
- **Header**: `Authorization: Bearer YOUR_SECRET_API_TOKEN`
- **Token Creation**: https://airtable.com/create/tokens

## Rate Limits
- **Limit**: 5 requests per second per base
- **Retry After**: 30 seconds on 429 status code

## Tables

### 1. Customers Table
- **Table ID**: `tblBgVlK9uNmh71TV`
- **Endpoint**: `/Customers` or `/tblBgVlK9uNmh71TV`

#### Fields Schema

| Field Name | Field ID | Type | Description | Example/Options |
|------------|----------|------|-------------|-----------------|
| Client Name | `fldAb7I9YEr6TOM9v` | Text | Single line of text | "fibertime™" |
| Client Type | `fldEmBJuxYviRaYJY` | Single select | Client category | "FNO", "Municipality", "Private" |
| Contact Information | `fldpble83gk8cEESr` | Long text | Multiple lines with mention tokens | Address and contact details |
| SLA Terms | `fldyBkc5LOlURma8y` | Long text | Service level agreement details | Full SLA text |
| Assigned Projects | `fldKwyqnFSN9XtnZF` | Link to another record | Array of Project record IDs | ["rec8116cdd76088af"] |
| WIP Projects | `fld1HKan24bNxYZLs` | Link to another record | Work in progress projects | ["rec8116cdd76088af"] |
| Total Projects | `fldL4yq41QPoGAbAa` | Count | Number of linked Projects | 5 |
| Active Projects | `fldL5a9V8xKIzvBmT` | Count | Number of active Projects | 2 |
| Client Summary | `fldDx4hpX1WL4ZG0g` | Formula/Rollup | Computed field | |
| Next Action Recommendation | `fldqQpKg9Q6mkUWt2` | Formula/Rollup | Computed field | |
| Contacts | `fld1ON92phAwKc35O` | Link to another record | Array of Contact record IDs | ["rec8116cdd76088af"] |

### 2. Projects Table
- **Table ID**: `tblXq0RpqQRAjoIe0`
- **Endpoint**: `/Projects` or `/tblXq0RpqQRAjoIe0`

#### Fields Schema

| Field Name | Field ID | Type | Description | Example/Options |
|------------|----------|------|-------------|-----------------|
| Project Name | `fldCkRSwvmtDoYoo1` | Text | Project identifier | "Lawley", "Mohadin", "Kuruman" |
| Customer | `fldStpnIz7Pvh6kZX` | Link to another record | Array of Customer record IDs | ["recHz7SGDYFSR88TJ"] |
| Province | `fldQql48fTLQLOIa2` | Link to another record | Array of Province record IDs | ["recTr5AS1SXBjgZaQ"] |
| Region | `fldKLLcreL05pDooH` | Text | Geographic region | "Vereeniging", "Potchefstroom" |
| Status | `fldOh9EEk8AngwLpD` | Single select | Project status | "Not Started", "In Progress", "Completed", "On Hold" |
| Start Date | `flddF1Vtt1c2HO9hU` | Date | ISO 8601 formatted date | "2025-05-05" |
| Project Duration Mths | `fldvGJJhCBxdUCIea` | Number | Duration in months | 12, 24 |
| End Date | `fldZzWmXCucf0GP7Q` | Formula | Computed end date | DATEADD({Start Date}, {Project Duration Mths}, 'month') |
| Regional PM | `fldZeRzHNh8V2tHnK` | Link to another record | Array of Staff record IDs | ["recjFqpODDFgyfJo7"] |
| Project Manager | `fldf4LJWp8NUwKXi3` | Link to another record | Array of Staff record IDs | ["recJWQIjSOG55HRtC"] |
| Total Homes PO | `fldWFeOQ4TN4zEyb5` | Number | Total homes in purchase order | 20109 |
| Pole Permissions BOQ | `fldf4Tf7eHuTD0FfM` | Number | Bill of quantities for poles | 4471 |
| Permissions Complete | `fldPS9N80WKQqxNOL` | Rollup | SUM of Daily Tracker permissions | 3759 |
| Permissions Missing | `fldC4dsE9kUwFb3bv` | Rollup | SUM of missing permissions | 8985 |
| Permissions Declined | `fldiYsOFJIhyE5KCz` | Rollup | SUM of declined permissions | 4 |
| Permissions % | `fldm5xWjj918pAejtFormula` | Formula | {Permissions Complete}/{Pole Permissions BOQ} | 0.8407 |
| Poles to Plant BOQ | `fldfCJIpvUyfo8v0E` | Formula | Same as Pole Permissions BOQ | 4471 |
| Poles Planted | `fldXuBW2xuKKHp2nl` | Rollup | SUM from Daily Tracker | 3074 |
| Poles Planted % | `fldnk0DZMuV5HfamW` | Formula | {Poles Planted}/{Poles to Plant BOQ} | 0.6875 |
| Home Sign-ups | `fldOS96iGowvx9RPJ` | Rollup | SUM from Daily Tracker | 2737 |
| Home Sign-Ups % | `fld16dTj5oifqMgxg` | Formula | {Home Sign-ups}/{Total Homes PO} | 0.1361 |
| Home Drops | `fldk1VygAlA74lpud` | Rollup | SUM from Daily Tracker | 555 |
| Home Drops % | `fld41uFI6yQKo5RTa` | Formula | {Home Drops}/{Total Homes PO} | 0.0276 |
| Homes Connected | `fldG6IwUcf709xGcY` | Rollup | SUM from Daily Tracker | 0 |
| Homes Connected % | `fldgO8IX5dYI8H9gL` | Formula | {Homes Connected}/{Total Homes PO} | 0 |
| Stringing BOQ | `flda3oxH8z8jeTPr3` | Formula | Sum of all stringing types | 174433 |
| Stringing Complete | `fldhLss9dLx1hbilK` | Formula | Sum of all completed stringing | 35153 |
| Total Stringing % | `fld66qFAzOqxRmAFh` | Formula | {Stringing Complete}/{Stringing BOQ} | 0.2015 |
| Stringing 24F | `fld3Qtkwd7pvABrKu` | Text | 24 fiber stringing BOQ | "174433" |
| 24F Complete | `fld3s771MBp8XcE5l` | Rollup | SUM from Daily Tracker | 30268 |
| Stringing 48F | `fldZBWToPV7Pa8hZB` | Text | 48 fiber stringing BOQ | "27793" |
| 48F Complete | `fldHNILmKaueBRdSu` | Rollup | SUM from Daily Tracker | 0 |
| Stringing 96F | `fldh5dBN1WNr5UBBy` | Text | 96 fiber stringing BOQ | "1625" |
| 96F Complete | `fldbXkQYwUhsv6sFb` | Rollup | SUM from Daily Tracker | 4211 |
| Stringing 144F | `fldSADfTzRreFOC7w` | Text | 144 fiber stringing BOQ | "7875" |
| 144F Complete | `fldTkOVBAItImaEn9` | Rollup | SUM from Daily Tracker | 674 |
| Stringing 288F | `fld8JwmmSdsWTuFlm` | Text | 288 fiber stringing BOQ | "4586" |
| 288F Complete | `fldy9ew1v8OkUs3oo` | Rollup | SUM from Daily Tracker | 0 |
| Trenching BOQ | `fldQHVENBnhiuO3rA` | Number | Trenching bill of quantities | 27511 |
| Trenching Complete | `fldi7Awbd60IAtbqs` | Rollup | SUM from Daily Tracker | 0 |
| Trenching % Complete | `fld5jFSFMEVSMjHfH` | Formula | {Trenching Complete}/{Trenching BOQ} | 0 |
| Linked Phases | `fldnufmAOTGk1qipT` | Link to another record | Array of Step record IDs | |
| Daily Reports | `fldth1h3fv5ojX0mw` | Link to another record | Array of Daily Tracker record IDs | |
| SHEQ Status | `fldVLnn1pLHjg5OSq` | Single select | Safety/Health status | "Pass", "Fail", "Pending" |
| AI Summary | `fld00L5AtuwGSCP8R` | Long text | AI-generated summary | |
| Auto Project Status | `fldMosCiF8J8aHpmI` | Formula | 1 if In Progress, 0 otherwise | 1 |
| Next Steps Recommendation | `fldtcrWZNvUuDGyJR` | Formula/Rollup | Computed recommendation | |
| SHEQ | `fldmjqr7hGLgAYaFg` | Link to another record | Array of SHEQ record IDs | |
| Contractors | `fldbfMftxixp3LtZV` | Link to another record | Array of Contractor record IDs | |
| Issues and Risks | `fldafmfSzczgJDJjx` | Link to another record | Array of Issues record IDs | |
| Weekly Reports | `fldX08WomYasejT81` | Text | Weekly report reference | "12/5/2025" |
| Monthly Reports | `fld97Q1ouveFGCTU9` | Link to another record | Array of Weekly Reports record IDs | |
| Tasks | `fld0Nggh9fbeW04ZT` | Text | Current tasks | |
| Client Name (from Customer) | `fldxgtACXGB9ydn6E` | Lookup | Client name from linked Customer | ["fibertime™"] |
| Province Name (from Province) | `flds3H2kSC5PWcKGI` | Lookup | Province name from linked Province | ["Gauteng"] |
| Name (from Regional PM) | `fldPLEgy7VstgCm8a` | Lookup | PM name from linked Staff | ["Wian Musgrave"] |

### 3. Staff Table (Referenced)
- Table exists but schema not provided yet
- Linked from Projects table via `Regional PM` and `Project Manager` fields

### 4. Provinces Table (Referenced)
- Table exists but schema not provided yet
- Linked from Projects table via `Province` field

### 5. Daily Tracker Table (Referenced)
- Table exists but schema not provided yet
- Linked from Projects table via `Daily Reports` field
- Contains daily progress metrics

### 6. Contractors Table (Referenced)
- Table exists but schema not provided yet
- Linked from Projects table via `Contractors` field

### 7. SHEQ Table (Referenced)
- Table exists but schema not provided yet
- Linked from Projects table via `SHEQ` field

### 8. Contacts Table
- **Table ID**: `tbljbXjdfK948a3Tl`
- **Endpoint**: `/Contacts` or `/tbljbXjdfK948a3Tl`
- Linked from Customers table via `Contacts` field

#### Fields Schema

| Field Name | Field ID | Type | Description | Example/Options |
|------------|----------|------|-------------|-----------------|
| Contact Name | `fld3dCDADkSBRTXTp` | Text | Single line of text | "Test SDupplier", "Hein Test" |
| Contact Type | `fldHvBPuOLzOmDQDt` | Single select | Contact category | "Staff", "Contractor", "Supplier", "Client" |
| Phone Number | `fldm90tgcQs8vUtq5` | Phone number | Telephone number | "(082) 321-5585" |
| Email | `fldurHzUliyxDVI4s` | Email | Valid email address | "test@velocity.com" |
| Title/Job Description | `fldxoqJEHXgUWiIzF` | Text | Job title or description | "CEO", "PM" |
| Linked Staff | `fldShSfkozqaVZVFE` | Link to another record | Array of Staff record IDs | ["rec8116cdd76088af"] |
| Linked Contractor | `fldsi2ArubxY0j7qe` | Text | Contractor name | "Test Contractor" |
| Linked Supplier | `fldBhKAFZoV4QkigK` | Link to another record | Array of Suppliers record IDs | ["rec8116cdd76088af"] |
| Linked Client | `fldOeBO1sszRlrIl4` | Link to another record | Array of Customers record IDs | ["recHz7SGDYFSR88TJ"] |
| Contractors | `fldIDEJ7PSH0UZ8ff` | Text | Contractor name (legacy?) | "Test Contractor" |
| Contractors 2 | `fld3UL1jPkmsvmgkX` | Link to another record | Array of Contractors record IDs | ["rec6N0GRb6EKQztSZ"] |
| Contractors 3 | `fld4jFqdXnEpw8BZe` | Text | Additional contractors | "foo", "bar" |
| Contractors 4 | `fldRywLwrb9BexOZX` | Link to another record | Array of Contractors record IDs | ["rec8116cdd76088af"] |

## API Operations

### List Records
- **GET** `/v0/appkYMgaK0cHVu4Zg/Customers`
- **Parameters**:
  - `fields[]`: Array of field names/IDs to return
  - `filterByFormula`: Airtable formula for filtering
  - `maxRecords`: Maximum total records to return
  - `pageSize`: Records per page (max 100)
  - `sort[0][field]`: Field to sort by
  - `sort[0][direction]`: "asc" or "desc"
  - `view`: View name or ID
  - `cellFormat`: "json" or "string"
  - `timeZone`: Required if cellFormat="string"
  - `userLocale`: Required if cellFormat="string"
  - `returnFieldsByFieldId`: Boolean to return field IDs as keys
  - `recordMetadata[]`: Include metadata like commentCount

### Create Record
- **POST** `/v0/appkYMgaK0cHVu4Zg/Customers`
- **Body**: `{"fields": {"Client Name": "...", ...}}`

### Update Record
- **PATCH** `/v0/appkYMgaK0cHVu4Zg/Customers/{recordId}`
- **Body**: `{"fields": {"Client Name": "...", ...}}`

### Delete Record
- **DELETE** `/v0/appkYMgaK0cHVu4Zg/Customers/{recordId}`

## Example Response Structure
```json
{
    "records": [
        {
            "id": "recHz7SGDYFSR88TJ",
            "createdTime": "2025-05-19T13:07:08.000Z",
            "fields": {
                "Client Name": "fibertime™",
                "Client Type": "FNO",
                "Contact Information": "1st Floor Oude Bank Building...",
                "Total Projects": 5,
                "Active Projects": 2,
                "Assigned Projects": ["recl5MdhdskBqMtJc", "..."]
            }
        }
    ],
    "offset": "itrP4opTE47EQ7hD2/recHz7SGDYFSR88TJ"
}
```

## Important Notes
1. Empty fields are not returned in responses
2. Field names and IDs can be used interchangeably
3. Table names and IDs can be used interchangeably
4. URL length limit: 16,000 characters
5. For long formulas, use POST to `/listRecords` endpoint
6. Formula fields may return error states
7. Pagination required for large datasets