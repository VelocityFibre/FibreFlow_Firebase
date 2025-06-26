# Airtable Complete Schema Documentation

Generated on: 2025-06-26T10:02:38.052Z

## Base Information
- **Base ID**: `appkYMgaK0cHVu4Zg`
- **Total Tables**: 31
- **Total Fields**: 728

## Tables Overview

| Table Name | Table ID | Field Count | Primary Field |
|------------|----------|-------------|---------------|
| Customers | `tblBgVlK9uNmh71TV` | 11 | Client Name |
| Projects | `tblXq0RpqQRAjoIe0` | 79 | Project Name |
| Contacts | `tbljbXjdfK948a3Tl` | 13 | Contact Name |
| Step | `tbln4FD3jLYZsYo5A` | 10 | Step |
| BOQ | `tblR8ro1hmRWJhOJ8` | 9 | Name |
| Task | `tblUw6gERPTg6DcIl` | 7 | Name |
| Task Template | `tblZ0UtyrnTB8kbzN` | 8 | Name |
| Master Material List | `tbla1TRu2wtOy1Okx` | 9 | Name |
| Stock Categories | `tblOeTbKb76ISQpyE` | 4 | Categories |
| Suppliers | `tblcpOQPLArEuKmhg` | 17 | Supplier Name |
| Staff | `tblJKVbss1eljnAWB` | 22 | Name |
| Contractors | `tbl4UwjKR0VcrXYdS` | 64 | Company Registered Name |
| Daily Tracker | `tblkw4um87urFNtrd` | 33 | Date |
| Weekly Reports | `tbl6h5JRx6UuAEKOD` | 7 | Month |
| Lawley Pole Tracker | `tblaajs2DbkHtDr7i` | 32 | VF Pole ID |
| Mohadin Pole Tracker | `tbl2zTAdTsiPmHd5u` | 32 | VF Pole ID |
| Stock Items | `tblkKexodDg2V3kCo` | 6 | Item No |
| Stock On Hand | `tblgVLGtoGxPfXFBA` | 13 | Description |
| SHEQ | `tblwbVeTeMK4KtGel` | 15 | Record ID |
| Stock Movements | `tblq1FZp7elXXSZ77` | 10 | Movement ID |
| Issues and Risks | `tblKcdhLlaaXdX4tz` | 17 | Issue or Risk ID |
| Drawdowns | `tbl9Te0HAOgsmH94j` | 9 | Milestone |
| Provinces | `tblmFVqkRVonAEAL1` | 5 | Province Name |
| Locations | `tblaywJ7HZyMdv78n` | 5 | Location Name |
| Test | `tbllsRYMMpj4vlNvc` | 6 | Name |
| KPI - Elevate | `tblVK7uUEYkQy5g5Z` | 18 | Contractor |
| Meeting Summaries | `tblFHgML2OwxlExfn` | 6 | Meeting Title |
| Raw Lawley | `tbly4ZNzHZUroYA9r` | 128 | Property ID |
| Raw Mohadin | `tblsNLRJZrhC3dA13` | 126 | Property ID |
| Lawley Pole # | `tblzk59ArVyv5dAW0` | 4 | Pole Number |
| Mohadin Pole # | `tbl4mybGyOTxP1p9d` | 3 | Pole Number |

## Detailed Table Schemas

### Customers
- **Table ID**: `tblBgVlK9uNmh71TV`
- **Primary Field**: Client Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Client Name | `fldAb7I9YEr6TOM9v` | singleLineText |  |
| Client Type | `fldEmBJuxYviRaYJY` | singleSelect (FNO, Municipality, Private) |  |
| Contact Information | `fldpble83gk8cEESr` | multilineText |  |
| SLA Terms | `fldyBkc5LOlURma8y` | multilineText |  |
| Assigned Projects | `fldKwyqnFSN9XtnZF` | multipleRecordLinks → Projects |  |
| WIP Projects | `fld1HKan24bNxYZLs` | multipleRecordLinks → Projects |  |
| Total Projects | `fldL4yq41QPoGAbAa` | count |  |
| Active Projects | `fldL5a9V8xKIzvBmT` | count |  |
| Client Summary | `fldDx4hpX1WL4ZG0g` | aiText |  |
| Next Action Recommendation | `fldqQpKg9Q6mkUWt2` | aiText |  |
| Contacts | `fld1ON92phAwKc35O` | multipleRecordLinks → Contacts |  |

#### Views

- **Grid view** (`viw03HClUAu6QbJPa`) - grid

### Projects
- **Table ID**: `tblXq0RpqQRAjoIe0`
- **Primary Field**: Project Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Project Name | `fldCkRSwvmtDoYoo1` | singleLineText |  |
| Customer | `fldStpnIz7Pvh6kZX` | multipleRecordLinks → Customers |  |
| Province | `fldQql48fTLQLOIa2` | multipleRecordLinks → Provinces |  |
| Region | `fldKLLcreL05pDooH` | singleLineText |  |
| Status | `fldOh9EEk8AngwLpD` | singleSelect (Not Started, In Progress, Completed, On Hold) |  |
| Start Date | `flddF1Vtt1c2HO9hU` | date |  |
| Project Duration Mths | `fldvGJJhCBxdUCIea` | number |  |
| End Date | `fldZzWmXCucf0GP7Q` | formula | Calculates the end date as the start date plus the project duration in months |
| Regional PM | `fldZeRzHNh8V2tHnK` | multipleRecordLinks → Staff |  |
| Project Manager | `fldf4LJWp8NUwKXi3` | multipleRecordLinks → Staff |  |
| Total Homes PO | `fldWFeOQ4TN4zEyb5` | number |  |
| Pole Permissions BOQ | `fldf4Tf7eHuTD0FfM` | number |  |
| Permissions Complete | `fldPS9N80WKQqxNOL` | rollup |  |
| Permissions Missing | `fldC4dsE9kUwFb3bv` | rollup |  |
| Permissions Declined | `fldiYsOFJIhyE5KCz` | rollup |  |
| Permissions % | `fldm5xWjj918pAejt` | formula |  |
| Poles to Plant BOQ | `fldfCJIpvUyfo8v0E` | formula |  |
| Poles Planted | `fldXuBW2xuKKHp2nl` | rollup |  |
| Poles Planted % | `fldnk0DZMuV5HfamW` | formula |  |
| Home Sign-ups | `fldOS96iGowvx9RPJ` | rollup |  |
| Home Sign-Ups % | `fld16dTj5oifqMgxg` | formula |  |
| Home Drops | `fldk1VygAlA74lpud` | rollup |  |
| Home Drops % | `fld41uFI6yQKo5RTa` | formula |  |
| Homes Connected | `fldG6IwUcf709xGcY` | rollup |  |
| Homes Connected % | `fldgO8IX5dYI8H9gL` | formula |  |
| Stringing BOQ | `flda3oxH8z8jeTPr3` | formula |  |
| Stringing Complete | `fldhLss9dLx1hbilK` | formula | Calculates the total stringing completed across all fiber counts by summing the values from the individual fiber count rollup fields. |
| Total Stringing % | `fld66qFAzOqxRmAFh` | formula |  |
| Stringing 24F | `fld3Qtkwd7pvABrKu` | singleLineText |  |
| 24F Complete | `fld3s771MBp8XcE5l` | rollup |  |
| Stringing 48F | `fldZBWToPV7Pa8hZB` | singleLineText |  |
| 48F Complete | `fldHNILmKaueBRdSu` | rollup |  |
| Stringing 96F | `fldh5dBN1WNr5UBBy` | singleLineText |  |
| 96F Complete | `fldbXkQYwUhsv6sFb` | rollup |  |
| Stringing 144F | `fldSADfTzRreFOC7w` | singleLineText |  |
| 144F Complete | `fldTkOVBAItImaEn9` | rollup |  |
| Stringing 288F | `fld8JwmmSdsWTuFlm` | singleLineText |  |
| 288F Complete | `fldy9ew1v8OkUs3oo` | rollup |  |
| Trenching BOQ | `fldQHVENBnhiuO3rA` | number |  |
| Trenching Complete | `fldi7Awbd60IAtbqs` | rollup |  |
| Trenching % Complete | `fld5jFSFMEVSMjHfH` | formula |  |
| Linked Phases | `fldnufmAOTGk1qipT` | multipleRecordLinks → Step |  |
| Daily Reports | `fldth1h3fv5ojX0mw` | multipleRecordLinks → Daily Tracker |  |
| SHEQ Status | `fldVLnn1pLHjg5OSq` | singleSelect (Pass, Fail, Pending) |  |
| AI Summary | `fld00L5AtuwGSCP8R` | multilineText |  |
| Auto Project Status | `fldMosCiF8J8aHpmI` | formula | Counts the number of projects that are currently 'In Progress' |
| Next Steps Recommendation | `fldtcrWZNvUuDGyJR` | aiText |  |
| SHEQ | `fldmjqr7hGLgAYaFg` | multipleRecordLinks → SHEQ |  |
| Contractors | `fldbfMftxixp3LtZV` | multipleRecordLinks → Contractors |  |
| Issues and Risks | `fldafmfSzczgJDJjx` | multipleRecordLinks → Issues and Risks |  |
| Weekly Report Details | `fldwZ3aFdFt6vqzIT` | singleLineText |  |
| Weekly Reports | `fldX08WomYasejT81` | singleLineText |  |
| Monthly Reports | `fld97Q1ouveFGCTU9` | multipleRecordLinks → Weekly Reports |  |
| Suppliers | `fld4YlizGNsfTTftV` | singleLineText |  |
| Suppliers 2 | `fldjFmDS6aSDzzbuT` | singleLineText |  |
| Tasks | `fld0Nggh9fbeW04ZT` | singleLineText |  |
| Project Status | `fldoXocIgRBCbBbv9` | singleLineText |  |
| Progress Updates | `fldhkiWFksdAnYE7L` | singleLineText |  |
| Date Tracker | `fldX6mR2mBhGVC62X` | singleLineText |  |
| Contractor Performance | `fldWskbc07BCOkYdH` | multipleRecordLinks → KPI - Elevate |  |
| Raw Data Link | `fldgu3QIV1TgBABFI` | multipleRecordLinks → Raw Lawley |  |
| Client Name (from Customer) | `fldxgtACXGB9ydn6E` | multipleLookupValues |  |
| Province Name (from Province) | `flds3H2kSC5PWcKGI` | multipleLookupValues |  |
| Name (from Regional PM) | `fldPLEgy7VstgCm8a` | multipleLookupValues |  |
| Calculation | `fldUAVbwqGJ0ErrzU` | formula |  |
| Total Homes Connected | `fld3YjvXHLSiCxIkG` | number |  |
| Total Poles BOQ | `fldlAIwZBSduNl6OM` | number |  |
| Stock On Hand | `fldUh3y7i5F1sj5ko` | singleLineText |  |
| Locations | `fldHnbTMlCOlXTJFg` | multipleRecordLinks → Locations |  |
| Lew Table | `fldGr7QfWm2bgHh7Q` | singleLineText |  |
| Lew Table 2 | `fldlIVn8yr4nNxSuV` | singleLineText |  |
| Test | `fldRIPOJMVxHt7s25` | singleLineText |  |
| Date Tracker 2 | `fldu3Vw9W2aZP5FHF` | singleLineText |  |
| Customers | `fldugaZZrRDa4h3Wx` | multipleRecordLinks → Customers |  |
| Deliverables1 | `fld9Qh4zZxaQg55Qs` | multipleRecordLinks → BOQ |  |
| BOQ copy | `fldt8SYBnO3ys7xoe` | singleLineText |  |
| Raw Data copy | `fldB1iIhAkKle1rqn` | singleLineText |  |
| Raw Data copy | `fldeXRcP0vfPEFgXf` | multipleRecordLinks → Raw Lawley |  |
| Raw Lawley copy | `fld8GDgZiXC0jUgPR` | multipleRecordLinks → Raw Mohadin |  |

#### Views

- **Grid view** (`viwJlfvkayfS5dpB5`) - grid
- **List** (`viwUq5nxf7nDNfgIB`) - levels
- **Gantt** (`viwg820iXJOFt0DAV`) - timeline

### Contacts
- **Table ID**: `tbljbXjdfK948a3Tl`
- **Primary Field**: Contact Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Contact Name | `fld3dCDADkSBRTXTp` | singleLineText |  |
| Contact Type | `fldHvBPuOLzOmDQDt` | singleSelect (Staff, Contractor, Supplier, Client) |  |
| Phone Number | `fldm90tgcQs8vUtq5` | phoneNumber |  |
| Email | `fldurHzUliyxDVI4s` | email |  |
| Title/Job Description | `fldxoqJEHXgUWiIzF` | singleLineText |  |
| Linked Staff | `fldShSfkozqaVZVFE` | multipleRecordLinks → Staff |  |
| Linked Contractor | `fldsi2ArubxY0j7qe` | singleLineText |  |
| Linked Supplier | `fldBhKAFZoV4QkigK` | multipleRecordLinks → Suppliers |  |
| Linked Client | `fldOeBO1sszRlrIl4` | multipleRecordLinks → Customers |  |
| Contractors | `fldIDEJ7PSH0UZ8ff` | singleLineText |  |
| Contractors 2 | `fld3UL1jPkmsvmgkX` | multipleRecordLinks → Contractors |  |
| Contractors 3 | `fld4jFqdXnEpw8BZe` | singleLineText |  |
| Contractors 4 | `fldRywLwrb9BexOZX` | multipleRecordLinks → Contractors |  |

#### Views

- **Grid view** (`viwrYyF3QMNbsPV3N`) - grid

### Step
- **Table ID**: `tbln4FD3jLYZsYo5A`
- **Primary Field**: Step

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Step | `fldgui5eboCW9SSPS` | singleLineText |  |
| Project | `fldaDytvehUDtpAux` | multipleRecordLinks → Projects |  |
| Order | `fldc0jgbz3c0V76AE` | number |  |
| Start Date | `fldhQ3O8CYH8KItFU` | date |  |
| End Date | `fldvEAVovQyOQgWIa` | date |  |
| Status | `fld0v41EYA0r6qpuz` | singleSelect (Active , Disabled) |  |
| Progress | `fldgJAqyilMwZfmKG` | number |  |
| Feedback | `fldgSBT2mzM80e4V6` | multilineText |  |
| Task Template | `fldGN5G6OpoaB0Pen` | multipleRecordLinks → Task Template |  |
| Task Template 2 | `fldZBCQbb5GEAhhqj` | singleLineText |  |

#### Views

- **Grid view** (`viwn15x8tXHKljwHd`) - grid
- **Kanban** (`viwr1Pe7fvMhbr7X3`) - kanban
- **Gantt** (`viwCiWgOCSXxdp9ag`) - block

### BOQ
- **Table ID**: `tblR8ro1hmRWJhOJ8`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldbeLhrB2LsHswT6` | singleLineText |  |
| Project | `fldej0c23X8ZTe00M` | multipleRecordLinks → Projects |  |
| Quantity | `fldnb0Kc2R5V1NTle` | number |  |
| Type | `fldhCMT7ptxOFUZ2a` | singleSelect (Labour , Material) |  |
| Notes | `fldMvD0VtIM24izYX` | multilineText |  |
| Status | `fld8wr7uUkBJaBivK` | singleSelect (Todo, In progress, Done) |  |
| Attachment Summary | `fldPPfxClIAKtgGsh` | aiText | An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary. |
| Step | `flduJ6Zl8G0VZAcrp` | singleLineText |  |
| Task Template | `fldWTI0qBndcn1B6Z` | multipleRecordLinks → Task Template |  |

#### Views

- **Grid view** (`viwsCNDGBSlt9SPUk`) - grid

### Task
- **Table ID**: `tblUw6gERPTg6DcIl`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldYsL2njVshTfv4l` | singleLineText |  |
| Step | `fld1OLPoNRCQJaZoF` | singleLineText |  |
| Notes | `fldfDtNF2JRzq51x5` | multilineText |  |
| Assignee | `fldEJHNiOsGSTQul9` | singleCollaborator |  |
| Status | `fldekp8PQ272xJYXb` | singleSelect (Todo, In progress, Done) |  |
| Attachments | `fldPzR4zAEWZuHILl` | multipleAttachments |  |
| Attachment Summary | `fldJPDeyTurPbYiL1` | aiText | An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary. |

#### Views

- **Grid view** (`viwgmdDmQd8ZBRU7C`) - grid

### Task Template
- **Table ID**: `tblZ0UtyrnTB8kbzN`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fld3WzfhTtsCVWuVN` | singleLineText |  |
| Step | `fld6iz2inpCbLRYf7` | multipleRecordLinks → Step |  |
| Order | `fldxS6cgfdhLjkzH3` | number |  |
| BOQ | `fldbk15HzIQxfmC1t` | multipleRecordLinks → BOQ |  |
| Notes | `fldk7h0zChRUsM0ox` | multilineText |  |
| Attachments | `fldU3FhtacWkwoHCN` | multipleAttachments |  |
| Status | `fldjOdlJqA7nzqXOD` | singleSelect (Todo, In progress, Done) |  |
| Attachment Summary | `fldOjrrst2radFhCt` | aiText | An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary. |

#### Views

- **Grid view** (`viwlQ1QgqL8kDyTY4`) - grid

### Master Material List
- **Table ID**: `tbla1TRu2wtOy1Okx`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldzEHf7D94FQUx2R` | singleLineText |  |
| Item No | `fldHxWZmAwy1DfMJY` | multilineText |  |
| UoM | `fldvt2v2Atmn7KIcu` | singleSelect (Each, Meter, Bundle, Cartridge, Box...) |  |
| Item Category | `fld080JOcU0zeg34a` | singleSelect (Drop Cable , Splitter , Pigtail, Midcoupler, Domejoints...) |  |
| Item Code | `fldIqPyA6Efj2aXQi` | multilineText |  |
| Item Rate | `fldfTPJ451GKt5APY` | multilineText |  |
| Supplier | `fldB1BkAFYUoaiEdL` | singleSelect (Dartcom, FTTX, LCTT, Contractor, Fiber Time...) |  |
| Lead Time | `fldnxWV4ZqJTvZ5DP` | singleSelect (Immediate, 1-2 Weeks, 2-3 Weeks, 3-4 Weeks, 5+ Weeks...) |  |
| Total Item Cost | `fldO8h5I3pYLlimiZ` | singleSelect (R0.00, R35,052.00, R223,407.00, R997,983.00, R1,140,926.25...) |  |

#### Views

- **Grid view** (`viwoPWBPiKHOjOjDI`) - grid

### Stock Categories
- **Table ID**: `tblOeTbKb76ISQpyE`
- **Primary Field**: Categories

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Categories | `fldyTQlOAFwFvObSe` | multilineText |  |
| Stock Items | `fldmtgAq5zS4z6kUS` | multipleRecordLinks → Stock Items |  |
| Stock Items copy | `fldvGm6RN8vek8nAx` | singleLineText |  |
| Stock Items copy | `fldiENJvgC9RT0FT4` | multipleRecordLinks → Stock On Hand |  |

#### Views

- **Grid view** (`viwr67ZT7m17OpOCx`) - grid
- **List** (`viw84BbnvmoFdZ7BO`) - levels

### Suppliers
- **Table ID**: `tblcpOQPLArEuKmhg`
- **Primary Field**: Supplier Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Supplier Name | `fldijqxIybQLvBL56` | singleLineText |  |
| Supplier Type | `fldI4ZKcsB1QGbVIr` | singleSelect (Local, International) |  |
| Region | `fldHAKu67o5uriQep` | singleLineText |  |
| Onboarding Status | `fld7ne2QTW6jJ6LEM` | singleSelect (Pending, Completed, Rejected) |  |
| Address | `fldJaSSrI8OFOsPeL` | multilineText |  |
| Phone Number H/O | `fldWsUa55T8xwbESQ` | phoneNumber |  |
| Email H/O | `fld8pDqIoyXb9x70k` | email |  |
| Contact Person/s | `fldZ3RqOpJARWbkAO` | multipleRecordLinks → Contacts |  |
| Key Account Manager | `fldgvV1WNHnqT5837` | multipleLookupValues |  |
| Contact Type | `fldbOeCq79JONND52` | multipleLookupValues |  |
| Phone Number KAM | `fldfooPzRLwbfQEPq` | multipleLookupValues |  |
| Email KAM | `fldF4oM6a6mB2pSQS` | multipleLookupValues |  |
| Rating | `fldDZN9xa5CA9uZ61` | number |  |
| Compliance Feedback | `fldewrUQaOd10Huvn` | multilineText |  |
| Supplier Photo | `fldxlOo4iL2onezZo` | multipleAttachments |  |
| Feedback Summary | `fldcjgz2DDz2jnasf` | aiText |  |
| Improvement Suggestions | `fldrHOSdAz4mPgwdr` | aiText |  |

#### Views

- **Grid view** (`viwANzG9TWZOx2HcS`) - grid

### Staff
- **Table ID**: `tblJKVbss1eljnAWB`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `flddmVKP0DPeYvnPU` | singleLineText |  |
| Role | `fldsnLuIBgysfh29X` | singleSelect (Senior Management, RPM, PM, Admin, Site Supervisor...) |  |
| Phone Number | `fldbCov30BOaD9bUH` | phoneNumber |  |
| Email | `fldjbOrR8CrihHSYr` | email |  |
| Assigned Projects | `fldWagcgsb7Ao5BsE` | multipleRecordLinks → Projects |  |
| Current Projects | `fldLLK9MKOhoDVNhq` | rollup |  |
| Total Assigned Projects | `fldcrWBH05U78wDpN` | count |  |
| Photo | `fldWSuVFFqJ7I6Bzv` | multipleAttachments |  |
| Role Summary | `fldwNDCea0XbwaEfp` | aiText |  |
| Project Management Insights | `fldQ72qv8Rf9secQO` | aiText |  |
| SHEQ | `fldRuDQete3715Epn` | multipleRecordLinks → SHEQ |  |
| Phases | `fldAVaTjZv5B74kn7` | singleLineText |  |
| Issues and Risks | `fldynYm1lUyhy2eiR` | multipleRecordLinks → Issues and Risks |  |
| Projects | `fldTJXjPBz1W8TfHs` | singleLineText |  |
| Projects 2 | `fldRAQdrdb3c5eMil` | multipleRecordLinks → Projects |  |
| Contacts | `fldi2IDiivJ9oBxSZ` | multipleRecordLinks → Contacts |  |
| Tasks (Assigned To) | `fldINeLZIE5ZtjOSm` | singleLineText |  |
| Tasks (Reported By) | `fldrWR0gcKlROhYug` | singleLineText |  |
| Stock Movements | `fldy4dPwep6nHUzej` | singleLineText |  |
| Contractor On-Boarding | `fld6mtvOoDHGF70FY` | singleLineText |  |
| Poles Lawley | `fldHKIB6N3VSxs50z` | multipleRecordLinks → Lawley Pole Tracker |  |
| Lawley Pole Tracker copy | `fldz9iJh3kT0qwRYL` | multipleRecordLinks → Mohadin Pole Tracker |  |

#### Views

- **Grid view** (`viwfM3FAXV0jFg6Bv`) - grid

### Contractors
- **Table ID**: `tbl4UwjKR0VcrXYdS`
- **Primary Field**: Company Registered Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Company Registered Name | `fld2zIPZPPeDNufPm` | singleLineText |  |
| Trading Name (if different) | `fldemXBl6z72t1kyD` | singleLineText |  |
| Company Registration Number (CIPC) | `fldRrSgnTSFtfXwzu` | singleLineText |  |
| VAT Number | `fldwet1oB9vCnTT28` | singleLineText |  |
| Type of Entity (PTY LTD, CC, Sole Prop, etc.) | `fldLw6uu2oQYK3ogq` | singleSelect ((PTY) Ltd, Close Corporation, Sole Proprietor, Trust) |  |
| Street Address | `fld1uAEzkvoXFujoX` | singleLineText |  |
| Street Address 2 | `flda1cgWxwqCKiz48` | singleLineText |  |
| Suburb | `fldO8U0zMLheOujOl` | singleLineText |  |
| Town/City | `fldwmZ6cWjssnJP1U` | singleLineText |  |
| Postal Code | `fldS3pIcptBgziJki` | number |  |
| Province | `fld2Vtxo9ayhJPSLO` | multipleRecordLinks → Provinces |  |
| Region(s) of Operation | `fldrZ3gBfK9hKLVvw` | multipleRecordLinks → Provinces |  |
| Main Contact | `fldVgXDlk7xnt13rr` | multipleRecordLinks → Contacts |  |
| Title/Job Description (from Designation/Title) | `fldEyKQY3JZuuCLE8` | multipleLookupValues |  |
| Phone Number (from Mobile Number) | `fldC9LMPahJ74ARZM` | multipleLookupValues |  |
| Office Number | `fldyV03n7XzplIfbV` | phoneNumber |  |
| Email Address | `fldd4bWWBkGxql920` | email |  |
| CIPC Registration Certificate | `fldeza8RvcgXdnS64` | multipleAttachments |  |
| ID's of all Directors | `fldjbbznRdPMiWFhH` | multipleAttachments |  |
| VAT Registration Cetificate | `fldY8Iu1TsgSplGW5` | multipleAttachments |  |
| Valid SARS Tax Clearance Certificate | `fldLKfsfHtsPc5OFn` | multipleAttachments |  |
| Valid B-BBEE Certificate or Affidavit | `fldVVBXAJfvUYwZYJ` | multipleAttachments |  |
| Proof of Bank Account (stamped letter or statement) | `fldWtfTileqQ9lTVV` | multipleAttachments |  |
| COID Registration & Letter of Good Standing | `fldNl4OxOcSanPPJa` | multipleAttachments |  |
| Public Liability Insurance (with coverage amount) | `fldIHr2BWvJKAA8Mm` | multipleAttachments |  |
| SHEQ Documentation (SHE Plans, Safety Files, etc.) | `fldkTfI5JpmxEwLb4` | multipleRecordLinks → SHEQ |  |
| Type of Services Offered  | `flddmjWo4AVuYFpic` | multipleSelects (Civil, Optical, SMME, Marketing) |  |
| Total Number of Teams Available | `fldWHL5PAfd6L3uiS` | singleLineText |  |
| Optical Teams Available | `fld9KYa3BUl3FxRQx` | singleLineText |  |
| Daily Capacity - Trenching | `fldvZa81ThR1U1T95` | singleLineText |  |
| Daily Capacity - Poles Planted | `fldRDUrx8Goabejyd` | multilineText |  |
| Homes Connected per Day | `fldEw1SmOcctrqxQm` | multilineText |  |
| Equipment Owned (e.g., augers, splicing machines, OTDRs) | `fldq6rPdYVkvEn5io` | multilineText |  |
| Key Staff Credentials (CVs of Site Supervisors, PMs, Safety Officers) | `fldIrp1wT2R70VbLk` | multipleAttachments |  |
| Past Project Experience (Summary Table) | `fldCKfHz5JIvG0A0F` | multilineText |  |
| Past Project Experience (Upload References) | `fldrOp6Xz0jEcEqoR` | multipleAttachments |  |
| Account Name | `fldtq2cqAP79wInFw` | multilineText |  |
| Bank Name | `fldfW5a2JeXxOXqOe` | multilineText |  |
| Account Number | `fldnCbM6zN0WMZPsr` | multilineText |  |
| Branch Code | `fld2oSZMmsK7nCCMt` | multilineText |  |
| Account Type | `fldI53sZDaSiBBvWj` | multilineText |  |
| Signed and stamped bank confirmation letter | `fldqe62AMROwTl4WM` | multipleAttachments |  |
| Signed Master Services Agreement (MSA) | `fld6gmTcFihhjLMGE` | multipleAttachments |  |
| NCNDA | `fldT9qYcSFKNtC7OI` | multipleAttachments |  |
| Acceptance of Velocity Fibre’s Code of Conduct | `fldBUn23daBV16NbI` | multipleAttachments |  |
| Agreement to Health & Safety Policy | `fldx9nSx5fZJ9aUCn` | multipleAttachments |  |
| Regional Induction Completed (Date & Location) | `fldvO3sWPoUc1HVOT` | checkbox |  |
| PPE Checklist Issued and Signed | `fldiXmZRNvYHKjLHK` | checkbox |  |
| Project Zone(s) Allocated | `fldDxYgAYb6yguyzn` | multilineText |  |
| Contact Added to Contractor WhatsApp Group (if used) | `fldtaBPhssI9mYQCN` | checkbox |  |
| Payment Terms Captured (e.g., 30 Days, Milestone-based) | `fldLky2wKVW58ZgHu` | singleSelect (Fortnite, Monthly, 30 Days, 60 Days) |  |
| Contractor Performance | `fldRJzbg5xE4MbpTo` | singleLineText |  |
| Field 64 | `fldUPazXF5F3ybAJV` | singleLineText |  |
| Province Name (from Province) | `fldQU60Lo6foonJmz` | multipleLookupValues |  |
| Province Name (from Region(s) of Operation) | `fld86YD5zaj8g3miN` | multipleLookupValues |  |
| Contact Name (from Main Contact) | `fldIX70ICBar9G7dC` | multipleLookupValues |  |
| Mobile Number | `fldD8w2buQdfFMUuX` | multipleRecordLinks → Contacts |  |
| Name (from Assigned Velocity PM) | `fldncOSowxaliz1wC` | multipleLookupValues |  |
| Contractor (from SHEQ Documentation (SHE Plans, Safety Files, etc.)) | `fldLOLFooC3GRE4PL` | multipleLookupValues |  |
| SHEQ | `fldsywgntUauOIm6O` | multipleRecordLinks → SHEQ |  |
| Daily Tracker | `fldak2BHHGTh6C6CK` | multipleRecordLinks → Daily Tracker |  |
| Projects | `fldsQQg3UemakwnNa` | multipleRecordLinks → Projects |  |
| Poles Lawley | `fld3XxZV3OkVZWnMV` | multipleRecordLinks → Lawley Pole Tracker |  |
| Lawley Pole Tracker copy | `fldVm776j5i3S09K7` | multipleRecordLinks → Mohadin Pole Tracker |  |

#### Views

- **Grid view** (`viwlkGr7djleDGSnO`) - grid

### Daily Tracker
- **Table ID**: `tblkw4um87urFNtrd`
- **Primary Field**: Date

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Date | `fldMBVx392nnHwAKa` | date |  |
| Report Name | `fldyiqzjsnzr7G3Lw` | formula | Combines the project name, contractor and the report date to create a unique report name. |
| Project | `fldH0V7vujGUqsWwM` | multipleRecordLinks → Projects |  |
| Contractor | `fld33zNMi8kBg9s1F` | multipleRecordLinks → Contractors |  |
| Permissions | `fldfnaHNx8uk5qPRr` | number |  |
| Missing Status | `fld2fEceWH2dFGKcd` | number |  |
| Declines | `fldAVrw4elcvdhxU3` | number |  |
| Poles Planted | `fldzaubestSxd82Pu` | number |  |
| Home Sign-Ups | `fld4IvBxNGiWvIBPP` | number |  |
| Home Drops | `fldMqwr2Doiw7D9nw` | number |  |
| Stringing 24 | `fldmNh9mgLPDHsxx5` | number |  |
| Stringing 48 | `fldeFisv0ihbqDylH` | number |  |
| Stringing 96 | `fldUorxCfq9eYjUvg` | number |  |
| Stringing 144 | `fldauf04YL4ABR6qP` | number |  |
| Stringing 288 | `fldZqzFQYCzaeCRid` | number |  |
| Trenching Today | `fld3CUvy8fnUBP7Ga` | number |  |
| Homes Connected | `fldqCGnGS0MKNgv3n` | number |  |
| Daily Summary | `fld8Ox99iRPYwmx7o` | aiText | A summary of daily progress compared to the overall project goals. |
| Report File | `fld3j6vsWoB5am0Ho` | multipleAttachments |  |
| Risk Flag | `fldbK2JEkcyMXL383` | checkbox |  |
| Key Issues | `fldFu0AdLJbaost9A` | multilineText |  |
| Key Issues Summary | `fld1kMWRwbMJ0o2ct` | aiText |  |
| Weekly Report Insights | `fldErZLV0mwwI0hNk` | aiText |  |
| Attachments | `fldYn6Ok6fWf2iK7P` | multipleAttachments |  |
| Weekly Report Details | `fld9yyf1AQEfgjLSI` | singleLineText |  |
| Weekly Reports | `fldYR8djSuOunfsz9` | singleLineText |  |
| Project Name | `fldUUS2U9S1HoGSw3` | formula |  |
| Trading Name (if different) (from Contractors) | `fldub0TLwqu9MsJ4O` | multipleLookupValues |  |
| Contractor Performance | `fld5nP9xLsIpz4dIK` | multipleRecordLinks → KPI - Elevate |  |
| KPI - Elevate | `fldz4WXJarR9hR1Y5` | multipleRecordLinks → KPI - Elevate |  |
| Permissions # (from Permissions) | `fldoS1sYMg9eOvYzq` | multipleLookupValues |  |
| Monthly Reports | `fldNhFKyXKVl4zZMz` | multipleRecordLinks → Weekly Reports |  |
| Monthly Reports 2 | `fldazTmpgOjFrEc1K` | singleLineText |  |

#### Views

- **Grid view** (`viwBjdOpTDtdk59Z0`) - grid
- **Calendar** (`viwTpvR0VEkch0K6M`) - calendar
- **Kanban** (`viwjV85wpeaZXEyIQ`) - kanban
- **Timeline** (`viwFIaC6q60xpKkiQ`) - timeline
- **Gantt** (`viwCBmYs07g7bkesL`) - timeline
- **List** (`viwwzm853fiIyu4IF`) - levels

### Weekly Reports
- **Table ID**: `tbl6h5JRx6UuAEKOD`
- **Primary Field**: Month

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Month | `fldQk1a1E1wOwn2Ii` | singleLineText |  |
| Project | `fldI0axbhnmb9XTWT` | multipleRecordLinks → Projects |  |
| Monthly Summary | `fld5GycwrbHV7uy27` | aiText |  |
| Attached Daily Reports | `fldoA3VXfHmwDLSil` | multipleRecordLinks → Daily Tracker |  |
| Summary from Daily | `flddSAkFouXCGqar7` | aiText | A report detailing the key deliverables mentioned in the attached daily reports for the month. |
| Weekly Key Issues | `fldn4w0RxOvyEWhWd` | aiText |  |
| Weekly Risk Analysis | `fldn9hFGea6RCTy0Y` | aiText |  |

#### Views

- **Grid view** (`viwFRjiWyqwdHqRen`) - grid

### Lawley Pole Tracker
- **Table ID**: `tblaajs2DbkHtDr7i`
- **Primary Field**: VF Pole ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| VF Pole ID | `fld8rzwQrO1YhS0pc` | autoNumber |  |
| Pole Number | `fld7vjwAEJrSHYGOz` | multipleRecordLinks → Lawley Pole # |  |
| If Pole # Not Found | `fldCGbs0mTebuGxdt` | singleLineText |  |
| Contractor | `fldUeFVBTOGny50DG` | multipleRecordLinks → Contractors |  |
| Working Team | `fldckwbVQSnHsfCnd` | singleSelect () |  |
| Date Pole Installed | `fldQg3WxKF6y5CrdU` | date |  |
| Location (GPS or Address) | `fldDFCeA23zWSfEjw` | singleLineText |  |
| Number (If Grouped)  | `fldbodEDriX06ONEt` | singleLineText |  |
| Type of Pole | `fldCJmdocHIiBCwmx` | singleSelect (7m x 100-120, 7m x 120-140, 7m x 140-160, ) |  |
| Before Upload | `fld3pl95GRdhXuy3l` | multipleAttachments |  |
| Before Uploaded | `fldMdzjHRRdnnc9Zk` | singleSelect (True, False, QA Done on site, Awaiting pictures from SMMEs) |  |
| Before Approved | `fldSXa4eHyXnQoJva` | singleSelect (Yes, No) |  |
| Depth Upload | `fldkZYGTqbIiLq3Nr` | multipleAttachments |  |
| Depth Uploaded | `flduVHMjvdfam5GoL` | singleSelect (True, False) |  |
| Depth Approved | `fldbIDm3Etwqr5wET` | singleSelect (Yes, No) |  |
| Concrete Upload | `fld7Ul4Dh04PMkyPt` | multipleAttachments |  |
| Concrete Uploaded | `fldvYqU9E8xk3nIp5` | singleSelect (True, False) |  |
| Concrete Approved | `fldjvIHWml2y0fE71` | singleSelect (No, Yes) |  |
| Compaction Upload | `fldCS3Lw0SUwhc3Fh` | multipleAttachments |  |
| Compaction Uploaded | `fldyHapC3lJ7i2a2E` | singleSelect (True, False) |  |
| Compaction Approved | `fldcH7X9HYOMeZV75` | singleSelect (Yes, No) |  |
| Front Upload | `fldMxMqtm804mzEFn` | multipleAttachments |  |
| Front Uploaded | `fldUjqGRGX6wE7xnx` | singleSelect (True, False) |  |
| Front Approved | `fldesJaXX0DrcNhMD` | singleSelect (Yes, No) |  |
| Side Upload | `fldv7MSQDxdL6JWFI` | multipleAttachments |  |
| Side Uploaded | `fldRuo6StjnXVbjT6` | singleSelect (True, False) |  |
| Side Approved | `fldlsEybZk36Y5JUQ` | singleSelect (Yes, No) |  |
| Quality Checked by: | `fld9GQwWk5t8twJ3v` | multipleRecordLinks → Staff |  |
| Approved Count | `fldNnrI4t5FteCKFv` | formula | Counts the number of approval fields that have a 'Yes' value |
| Last Modified | `fldRWXU5BWUTX5hrH` | lastModifiedTime |  |
| Modified By | `fldPe6WptunrYy4ge` | lastModifiedBy |  |
| Lawley Pole # copy | `fldCxMyGLCMUrMv1M` | singleLineText |  |

#### Views

- **Grid view** (`viwwA7Mv5qRnOrseR`) - grid

### Mohadin Pole Tracker
- **Table ID**: `tbl2zTAdTsiPmHd5u`
- **Primary Field**: VF Pole ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| VF Pole ID | `fld0Q9E1H5Z6aWMno` | autoNumber |  |
| Pole Number | `fldZUTELU0p0A2sML` | multipleRecordLinks → Mohadin Pole # |  |
| If Pole # Not Found | `fldPmYTJnQDhcdlVw` | singleLineText |  |
| Working Team | `fld91xieSJ77lope4` | singleSelect () |  |
| Contractor | `fldMDf3M95Evr9MBS` | multipleRecordLinks → Contractors |  |
| Date Pole Installed | `fldIFD4I0W4GYGdb6` | date |  |
| Location (GPS or Address) | `fldv4cmLikx4LjqhI` | singleLineText |  |
| Number (If Grouped)  | `fld3NNMOHzV8ZSzCF` | singleLineText |  |
| Type of Pole | `fldu8WlzsYGquGikJ` | singleSelect (7m x 100-120, 7m x 120-140, 7m x 140-160, ) |  |
| Before Upload | `fldVOVhgW8bpQyk1x` | multipleAttachments |  |
| Before Uploaded | `fldEC9rS78bvggVXw` | singleSelect (True, False, QA Done on site, Awaiting pictures from SMMEs) |  |
| Before Approved | `fldKmKcpXPVvJsvtm` | singleSelect (Yes, No) |  |
| Depth Upload | `fldcoyO4GsGqEuPLD` | multipleAttachments |  |
| Depth Uploaded | `fldmkhUuLudif9smX` | singleSelect (True, False) |  |
| Depth Approved | `fld37dueUKuyk9iC5` | singleSelect (Yes, No) |  |
| Concrete Upload | `fldZjVcOxh2XFokNF` | multipleAttachments |  |
| Concrete Uploaded | `fldnn02kUpvsWrunh` | singleSelect (True, False) |  |
| Concrete Approved | `fldbUiP7CC0GTjq5d` | singleSelect (No, Yes) |  |
| Compaction Upload | `flduhDTHg9SEagPDt` | multipleAttachments |  |
| Compaction Uploaded | `fldq6KxNjCHfb6W0Q` | singleSelect (True, False) |  |
| Compaction Approved | `fld46H5kXfMU73H5h` | singleSelect (Yes, No) |  |
| Front Upload | `fldEWmyECpYcfDqDz` | multipleAttachments |  |
| Front Uploaded | `fldMI0O2We4ExbjlJ` | singleSelect (True, False) |  |
| Front Approved | `fld6Rji8dhBz5R3KP` | singleSelect (Yes, No) |  |
| Side Upload | `fldnwm01TObTZNIDU` | multipleAttachments |  |
| Side Uploaded | `fldJTYe3JAl5Of5Ri` | singleSelect (True, False) |  |
| Side Approved | `flddReGmfB1eR9vS2` | singleSelect (Yes, No) |  |
| Quality Checked by: | `fld15qE7AmrgmAv1H` | multipleRecordLinks → Staff |  |
| Approved Count | `fldFM1QfJmDB7GwDH` | formula | Counts the number of approval fields that have a 'Yes' value |
| Last Modified | `fldJlx2gRdS1Q93pT` | lastModifiedTime |  |
| Modified By | `fldHDG4AJLlzRCQeq` | lastModifiedBy |  |
| Lawley Pole # copy | `flduWmGR1TK2kQhZY` | singleLineText |  |

#### Views

- **Grid view** (`viwoZHUGlHPvHvec3`) - grid

### Stock Items
- **Table ID**: `tblkKexodDg2V3kCo`
- **Primary Field**: Item No

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Item No | `fldA5nfkt92gkq25L` | number |  |
| Description | `fldrRu2NF4CrndKav` | multilineText |  |
| UoM | `fld7EslZVN5bTAk8d` | singleSelect (Each, Meter, Bundle, Cartridge, Box...) |  |
| Item Category | `fldJh5SOt1AuUNTsh` | multipleRecordLinks → Stock Categories |  |
| Stock Movements | `fld4p6ReS5gXnEEQV` | singleLineText |  |
| Categories (from Item Category) | `fldqZ0MwT8V9omgrB` | multipleLookupValues |  |

#### Views

- **Grid view** (`viwVvfZ80L8oA93Xg`) - grid

### Stock On Hand
- **Table ID**: `tblgVLGtoGxPfXFBA`
- **Primary Field**: Description

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Description | `fldn21bSQ7TeH759H` | multilineText |  |
| UoM | `fld3PZu46QmYduF7p` | singleSelect (Each, Meter, Bundle, Cartridge, Box...) |  |
| Item Category | `fldFsC1TE4RheHert` | multipleRecordLinks → Stock Categories |  |
| Lawley | `fldJNTJYT4imU46lQ` | rollup |  |
| Mohadin | `fldiFmqWO2XBpIfQX` | rollup |  |
| Kuruman | `fld9wpUniWbCkUVVt` | rollup |  |
| Ivory Park | `fldgIMrrN1huiRba7` | rollup |  |
| Mamelodi | `fldzgoM1oJLXyJ9V6` | rollup |  |
| Stock Movements | `fldVhm1jdbqEG4nCS` | multipleRecordLinks → Stock Movements |  |
| Item No | `fldwgUopEcj3Ekn4X` | number |  |
| Categories (from Item Category) | `fldmaxVB4bcWIgBqN` | multipleLookupValues |  |
| Project Name (from Stock Lawley) | `fldmY8Dlnf5GUs0Bc` | multipleLookupValues |  |
| Stock Movements 3 | `fldSSnkdtz2Csm2jc` | singleLineText |  |

#### Views

- **Grid view** (`viwRGM8dbOpbU3oWs`) - grid

### SHEQ
- **Table ID**: `tblwbVeTeMK4KtGel`
- **Primary Field**: Record ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Record ID | `fldZV8YPoCepe5PQB` | autoNumber |  |
| Contractor | `fld0dcyJMcrkAQHRn` | multipleRecordLinks → Contractors |  |
| Related Project | `fldzBzX4IUufJ7EG8` | multipleRecordLinks → Projects |  |
| Audit Date | `fld8KA05KTYyL4EB4` | date |  |
| Status | `fldgOfK8yxC8RprnV` | singleSelect (Pass, Fail) |  |
| Issues | `fldO9Emg4B2PntacM` | multipleRecordLinks → Issues and Risks |  |
| Officer | `fldQv7nOWsLar6I6P` | multipleRecordLinks → Staff |  |
| Compliance Document | `fldahLRdRzwF1DuUd` | multipleAttachments |  |
| Total Issues | `fldJ64t7ffCTFzT8c` | count |  |
| Open Issues | `fldCbH4LVW6OZpjX3` | rollup |  |
| Resolved Issues | `flds7XC6rACRhoRcM` | rollup |  |
| Audit Summary | `fldjeRYqng0UkfDgZ` | aiText |  |
| Next Steps Recommendation | `fld2kAJyarc0jSwPe` | aiText |  |
| Contractors | `fldSjunsShnaqFkWA` | multipleRecordLinks → Contractors |  |
| Company Registered Name (from Contractors 2) | `fldwbFKAgfD8Almad` | multipleLookupValues |  |

#### Views

- **Grid view** (`viwlqNpwQQb5Qd8Ni`) - grid

### Stock Movements
- **Table ID**: `tblq1FZp7elXXSZ77`
- **Primary Field**: Movement ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Movement ID | `fldUPXELIwGk8mc0g` | autoNumber |  |
| Date | `fldjiJFiDtc55pR9y` | date |  |
| Stock Item | `fldAgkaYtxI3WKZ0l` | multipleRecordLinks → Stock On Hand |  |
| Quantity | `fldH8u9YoNjvkiHjC` | number |  |
| Movement Type | `fldEoMDMklx0ttHwA` | singleSelect (In, Out) |  |
| Project Location | `fldspI7cGYjAnuDls` | multipleRecordLinks → Locations |  |
| Issued by | `fldeOr67gZcxo4Lof` | singleLineText |  |
| Received by  | `fldGGE7fh1C4dyJcY` | singleLineText |  |
| Comments | `fld1wBsrdx5pTAv1v` | singleLineText |  |
| Name (from Staff) | `fldCyff4j36zPEKGD` | multipleLookupValues |  |

#### Views

- **Grid view** (`viwFYnYEFlE7Eps6f`) - grid

### Issues and Risks
- **Table ID**: `tblKcdhLlaaXdX4tz`
- **Primary Field**: Issue or Risk ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Issue or Risk ID | `fldZkwe3Z0wfOx1fE` | singleLineText |  |
| Project | `fldmo7yUNP1CIvCK2` | multipleRecordLinks → Projects |  |
| Step | `fldHdbx5fEpXQJoi7` | singleLineText |  |
| Type | `fldkmJop5Rww3KJef` | singleSelect (Risk, Delay, Extortion) |  |
| Description | `fldXK978xzCRnzgIJ` | multilineText |  |
| Status | `fldeiu2ocfmaUg9Sx` | singleSelect (Open, In Progress, Resolved, Closed, ...) |  |
| Date Reported | `fldpSKCkAloILoJZS` | date |  |
| Resolution Date | `fldGuWcXIw2pEqo4L` | date |  |
| Assigned Staff | `fldxZU5fq0fgdp823` | multipleRecordLinks → Staff |  |
| Priority | `fldzzECO7dwrkjlNV` | singleSelect (Low, Medium, High, Critical) |  |
| Risk Flag | `fldEJPmG42HJRWZpT` | checkbox |  |
| Attachments | `fldhOF0pVNwTDpwlA` | multipleAttachments |  |
| AI Summary | `fldYER1mCpkYPqTJd` | multilineText |  |
| Phase Status | `fldzONpN8DNuS4GAr` | multipleLookupValues |  |
| Project Status | `fldznRmb7HhFtqraK` | multipleLookupValues |  |
| Risk Analysis | `fldLpok5MtGA4Ywkx` | aiText |  |
| SHEQ | `fldeHC1KQMLQVgwVb` | multipleRecordLinks → SHEQ |  |

#### Views

- **Grid view** (`viwR9mARoT8txsnQL`) - grid

### Drawdowns
- **Table ID**: `tbl9Te0HAOgsmH94j`
- **Primary Field**: Milestone

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Milestone | `fld4L1khObLDTJwuM` | singleLineText |  |
| Project | `fldt95rJpzNYyLipS` | singleLineText |  |
| Claimed Amount | `fldAOooAGwcHCYlmo` | currency |  |
| Paid Amount | `fldQHYkL0FUKe5OCY` | currency |  |
| Submission Date | `fld1f851QFGhM1JK2` | date |  |
| Status | `fldhKpkklulHcupfu` | singleSelect (Pending, Approved, Rejected, Paid) |  |
| Outstanding Amount | `fldm5L0VXfCKukKqc` | formula |  |
| Drawdown Status Summary | `fldSReIkiSRGibcvG` | aiText |  |
| Next Action Recommendation | `fldiuSN8K1rDBtVi1` | aiText |  |

#### Views

- **Grid view** (`viwl6uzMYvzgh5sZ2`) - grid

### Provinces
- **Table ID**: `tblmFVqkRVonAEAL1`
- **Primary Field**: Province Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Province Name | `flde5bymcwVtCErsx` | singleLineText |  |
| Projects | `fldMhsTyzabKlA0ak` | multipleRecordLinks → Projects |  |
| Contractors | `fldPpmaZuZ1WJHhWD` | singleLineText |  |
| Contractors 2 | `fldTSDJsiSj8vKMed` | multipleRecordLinks → Contractors |  |
| Contractors 3 | `fldfCkpCFA70gDGrI` | multipleRecordLinks → Contractors |  |

#### Views

- **Grid view** (`viwtx77zhCkDq9omL`) - grid

### Locations
- **Table ID**: `tblaywJ7HZyMdv78n`
- **Primary Field**: Location Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Location Name | `fldCuHwj9QlpL9l82` | singleLineText |  |
| Project | `fldPBwkZgmq5kM3Ch` | multipleRecordLinks → Projects |  |
| Stock Movements | `fldlciYrBqYAI9Loq` | singleLineText |  |
| Project Name (from Project) | `fld08pP9sOHFdPVDJ` | multipleLookupValues |  |
| Stock Movements 2 | `fldIn2sDj8ToFaSgQ` | multipleRecordLinks → Stock Movements |  |

#### Views

- **Grid view** (`viwScnzQGBcJH7ZOe`) - grid

### Test
- **Table ID**: `tbllsRYMMpj4vlNvc`
- **Primary Field**: Name

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldz4HaXNPGAT7n6K` | singleLineText |  |
| Notes | `fldcvJEjuhWbQDrkq` | multilineText |  |
| Assignee | `fldzpKuUdyDn3c0oZ` | singleCollaborator |  |
| Status | `fldZ4VRAfL9lVkTEW` | singleSelect (Todo, In progress, Done) |  |
| Attachments | `fldTDf6JfLOzXUzcO` | multipleAttachments |  |
| Attachment Summary | `fldtA35TvOKwnwhv2` | aiText | An AI generated summary of the Attachments field. Upload files to Attachments to generate a summary. |

#### Views

- **Grid view** (`viwhO6REJQcE3IXti`) - grid

### KPI - Elevate
- **Table ID**: `tblVK7uUEYkQy5g5Z`
- **Primary Field**: Contractor

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Contractor | `fldAgwviCusNFuCcx` | singleLineText |  |
| Date | `fldSJrzGAQMHKOMan` | multipleRecordLinks → Daily Tracker |  |
| Date (from Date) | `fldtOllhvxg8btUFW` | multipleLookupValues |  |
| Project | `fld8cOROeulw38QIW` | multipleRecordLinks → Projects |  |
| Permissions | `fldNFVRRUdE5rAi6S` | rollup |  |
| Missing Status | `fldxtCqRcKRUQj5kb` | rollup |  |
| Declines | `fldQwJhzQOVp4Y1cu` | rollup |  |
| Poles Planted | `fldstCro4gkIyvc4I` | rollup |  |
| Home Sign-Ups | `fldreCgfVsYtVR3Aj` | rollup |  |
| Deliverable | `fldq5Bcw8yIvh74eb` | singleLineText |  |
| Issues Noted | `fldOAUcQdkDRte4At` | multilineText |  |
| Daily Efficiency | `fld39sjq14QxLXvBI` | aiText |  |
| Overall Project Contribution Summary | `fldE0XAnNMfnTqLc3` | aiText |  |
| Performance Rating | `fldOaIopg7tFNZBGN` | rating |  |
| Project Phase | `fld12GruvXXAHN9vf` | singleLineText |  |
| Daily Tracker Link | `fld9p6TXew6e9I2tS` | multipleRecordLinks → Daily Tracker |  |
| Permissions Today (from Daily Tracker Link) | `fldEuoo5XqhgdAwHG` | multipleLookupValues |  |
| Deliverable (from Deliverable) | `fldqA6lF0EJSaR0Ix` | multipleLookupValues |  |

#### Views

- **Grid view** (`viwXRDL4Z5YUdvlV0`) - grid

### Meeting Summaries
- **Table ID**: `tblFHgML2OwxlExfn`
- **Primary Field**: Meeting Title
- **Description**: Table for storing meeting summaries and action items

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Meeting Title | `fld9W27bsDEuak85p` | singleLineText | Title of the meeting |
| Date | `fldSZWbNPx99e6GEk` | date | Date when the meeting occurred |
| Participants | `fldCCWGaqtnKpUaPe` | multilineText | List of meeting participants |
| Summary | `fldhTI2aQbHqNaw7o` | multilineText | Summary of the meeting discussion |
| Action Items | `fldDRWumXqLsbOun5` | multilineText | Action items from the meeting |
| Status | `fldoqt2wrqU6HbdyD` | singleSelect (Pending, In Progress, Completed) | Status of meeting follow-up |

#### Views

- **Grid view** (`viw4rFk4FyZWFru6S`) - grid

### Raw Lawley
- **Table ID**: `tbly4ZNzHZUroYA9r`
- **Primary Field**: Property ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Property ID | `fldrZG08Fo1BoipdD` | number |  |
| Date Status Changed | `fldVe5oKKJM2PNl5e` | dateTime |  |
| Status | `fldxQu2dJcsSfXqca` | singleSelect (Pole Permission: Approved, Missing, Home Sign Ups: Approved & Installation Scheduled, Home Sign Ups: Declined, Home Installation: Installed...) |  |
| Permissions # | `flduhjG0V4yC8i8PM` | formula | Counts the number of records where the Status field is 'Pole Permission: Approved' |
| Missing # | `fldQjin2FgQpqG3EB` | formula |  |
| Sign-up Approved | `fldVXy0yape4ElIFy` | formula |  |
| Flow Name Groups | `fld4duK5wgi0aytUO` | multilineText |  |
| Site | `fldzptJuNzUTpK4K4` | singleSelect (LAWLEY, Mohadin, Site, Lawley) |  |
| Sections | `fldLddSf7lgAh8XuO` | number |  |
| PONs | `fldADAc1QFMd7RvXF` | singleSelect (C4P14, C4P11, C4P6, , C4P5...) |  |
| Location Address | `fldkxndiptj6Yd3FO` | multilineText |  |
| Actual Device Location (Latitude) | `fldBNYZv7hTttXnGe` | number |  |
| Actual Device Location (Longitude) | `fldSA5jsvR5Xn8VtX` | number |  |
| Distance between Actual and Captured Point | `fldbxCVgvv6cB7djo` | number |  |
| lst_mod_by | `fldo12eSffHpmxE1W` | singleSelect (ftlawhh1@fibertime.com, ftlawhh2@fibertime.com, ftlawhh6@fibertime.com, ftlawhh7@fibertime.com, ftlawhh10@fibertime.com...) |  |
| lst_mod_dt | `fld4C8LHdHlet26fY` | dateTime |  |
| Pole Number | `fldchlohvsQOkBRZG` | multilineText |  |
| Drop Number | `fldtvkYtEWzZeDNF0` | multilineText |  |
| Language | `fldP49jhGJstKWE8v` | singleSelect (English, , Tshivenda, isiZulu, isiXhosa...) |  |
| Survey Date | `fldPtyMR3jCmAiXc8` | dateTime |  |
| CONSENT FORM PERSONAL DETAILS OF THE PERSON SIGNING THIS FORM ( | `fldU0SkpGs5dGUWQi` | multilineText |  |
| UXWEBHU lwesivumelwano IINKUKACHA ZOMNTU OTYIKITYA OLUXWEBHU ( | `fld92THZTrNlq6ZtA` | multilineText |  |
| Address Validation | `fldQNkWzSMgE7x8ns` | multilineText |  |
| Stand Number | `fldC92wlvXo2jUCrJ` | multilineText |  |
| Latitude & Longitude | `fldyvGw9geaY8p5js` | multilineText |  |
| CONSENT TO PLANT A POLE | `fldAVoj2onJUr98Nc` | multilineText |  |
| ISIVUMELWANO SOKUTYALWA KWEPALI | `fldferfRXP58cJovd` | multilineText |  |
| Owner or Tenant | `fldjcunCIhXTifdL3` | singleSelect (Owner, Tenant, , Owner or Tenant) |  |
| Special Conditions (if any) | `fldiDVG8b4uuxlwDF` | singleSelect (, none, bricks to b3 removed) |  |
| Field Agent Name (pole permission) | `fldPK6KHn7ze2XJZ9` | singleSelect (manuel, nathan, marchael, Manuel, Adrian...) |  |
| Date of Signature | `fldOs7Ttc2NZYdYQ3` | dateTime |  |
| Latitude | `flduRzfEEoW8OW4iE` | number |  |
| Longitude | `fldfpF0V0J893BDHo` | number |  |
| Pole Permissions - Actual Device Location (Latitude) | `fldPTuEH4zdWyEOvG` | number |  |
| Pole Permissions - Actual Device Location (Longitude) | `fldbiEAal8wiP7pGp` | number |  |
| Pole Permissions - Distance between Actual and Captured Point | `fld4hqyNeq4FKhowo` | number |  |
| Last Modified Pole Permissions By | `fldFhrzZz3uIeBK5A` | singleSelect (ftlawhh1@fibertime.com, ftlawhh2@fibertime.com, ftlawhh6@fibertime.com, ftlawhh7@fibertime.com, ...) |  |
| Last Modified Pole Permissions Date | `fldFDL9n5v6o4XNVj` | dateTime |  |
| Access to Property | `fldXfh9mePRU2yWCO` | singleSelect (, Yes, No) |  |
| Declined | `fldJUt3YYd9uMzuFx` | singleSelect (, No, Yes) |  |
| if Yes, Reason Why it was Declined | `fldwTsOQlOdNzelUi` | singleSelect (, Illegal Electrical connection, Not interested - I don't want fiber internet at my home, Not interested - I have home internet with another provider, Damaged/Vandalised Property) |  |
| Primary House of Backyard Dwelling | `fldMz3KISIRk0tSDf` | singleSelect (, Primary House, Backyard Dwelling) |  |
| Number of People Living in the Home | `fld7QdwwtVM3moRIP` | number |  |
| Residential or Commercial Dwelling | `fld6o9PKyPMz6Itbs` | singleSelect (, Residential, Commercial) |  |
| Mark Type of Commercial if Applicable | `fldKd4qiovrlJVaza` | singleSelect (, Spaza shop) |  |
| How do you access internet at your home currently? | `fldmR7JoznPiTGQlB` | singleSelect (, Other, Rain, Vodacom MTN Cell C or Telkom) |  |
| Backyard Dwellings | `fldULRbFdLL4ZeuQU` | singleSelect (, Yes, No) |  |
| If Yes, How Many Dwellings | `fldU5KnLSp2Zg7pf4` | number |  |
| if Yes, How Many People | `fldxgBbdEb8dKORP4` | number |  |
| If Yes, Structure of Backyard Dwelling | `fldBRjzqkNRPbxEJ9` | singleSelect (, Brick and Mortar, Zinc, Wood) |  |
| Consent Form | `fldaHHDe1x6Lx1P15` | multilineText |  |
| House Number | `fldG1kT04OgH6MyFi` | multilineText |  |
| I hereby consent that I have a permanent Municipal electrical c | `fldOmedI4o4MsazTD` | number |  |
| Preferred Place for Router Installation in Home | `fldNfhGSMeQ32W5Un` | singleSelect (, Living Room, Family Room, Dining Room, Bedroom 2...) |  |
| Number of Sticker Placed on Door | `fldKg6n5IHeRIeobP` | multilineText |  |
| Photo of Property | `fld8UHdl9oC4sd5nL` | number |  |
| General Comments | `fldXb50hJf2S3kzH5` | multilineText |  |
| Field Agent Name (Home Sign Ups) | `fldUWAmwjPPbz472P` | singleSelect (, palesa, Vinolia Mokwatsi, Sylvia Mogotlwane, Wian...) |  |
| Home Sign Ups - Actual Device Location (Latitude) | `fld6BfIbjBUJZbgHR` | multilineText |  |
| Home Sign Ups - Actual Device Location (Longitude) | `fldGKzWi8nHHs1WUO` | multilineText |  |
| Home Sign Ups - Distance between Actual and Captured Point | `fldSudrep7RWKM24A` | number |  |
| Last Modified Home Sign Ups By | `flddW1CR3GY7p63T7` | singleSelect (, ftlawhh18@fibertime.com, ftlawhh14@fibertime.com, ftlawhh16@fibertime.com, godfrey@fibertime.com...) |  |
| Last Modified Home Sign Ups Date | `fld6GcDCigWXZ2lTb` | dateTime |  |
| Nokia Easy Start ONT Activation Code | `fldQX7iMAYLwvBl4h` | multilineText |  |
| ONT activation light level | `fldyqHwTjC4h6xMX7` | multilineText |  |
| Record any Relevant Comments | `fldKe51nMrD8xscaV` | multilineText |  |
| Powermeter reading (at dome) | `flddR6jm4SRH6vCdD` | number |  |
| Patched and labelled drop | `fldA7sF70kPonrzS9` | multilineText |  |
| Photo of Splitter Tray in Dome Joint (front side) | `flddpD4ns7NMc28LA` | number |  |
| Photo of Connection Points in the BB/Handhole (other side of jo | `fldrIqU2nTqniIvgm` | multilineText |  |
| Photo of the Handhole Before Closing | `fldms1tFiIDcvE8my` | multilineText |  |
| Photo of the Handhole After Closing | `fldS3PLVzMN3TVpyu` | multilineText |  |
| Photo Showing Location on the Wall (before installation) | `fldCFfLbJdYAE380T` | number |  |
| Home Entry Point: Outside (Pigtail screw / Duct entry) | `fldaiT5I3ZwCsiNum` | number |  |
| Home entry point | `fldGWCv44q2OVGkQl` | multilineText |  |
| Outside cable span: Pole to Pigtail screw | `fldPIgYcmqQhqDJ4t` | multilineText |  |
| ONT Barcode | `fldkU6AjEfEz4SsRr` | number |  |
| Mini-UPS Serial Number | `fldDGjT3Muzc31leM` | number |  |
| Photo of Active Broadband Light (with FT sticker and Drop Numbe | `fldYt1tak8AiX76Gl` | multilineText |  |
| Powermeter reading (at ONT before activation) | `fldoZJ2L8w7bAzOjN` | multilineText |  |
| Fiber cable: entry to ONT (after install) | `fldHWQzhr7qUm1EBK` | number |  |
| Record Relevant Comments | `fld018EHdD2hzLeFw` | multilineText |  |
| Any Damages to be Reported | `fld2WdV39FjeHZRFI` | multilineText |  |
| If there are, Please Specify | `fldwbe8cc1Rvd4vie` | multilineText |  |
| Overall work area after complete install: including ONT and fib | `fldcVGFxP5vT5YmPT` | multilineText |  |
| Dome Joint Number / BB | `fldPls0CzcydJ1pLH` | multilineText |  |
| Length of Drop Cable | `fldcIHL3xKmjmbBzt` | multilineText |  |
| Client happy with Installation | `fld0ixT7D75NM8XDO` | multilineText |  |
| Read English Terms and Conditions | `fldT5TsgBc9A3cwrU` | multilineText |  |
| Read Xhosa Terms and Conditions | `fldNDdS7zED5UE4ri` | multilineText |  |
| Installer Name | `flduNmmryRH9TJSxJ` | singleSelect (, gk, wian) |  |
| Home Installations - Actual Device Location (Latitude) | `fld6HmyIveuyniPfV` | number |  |
| Home Installations - Actual Device Location (Longitude) | `fldw8rjS1mZzG6fPN` | number |  |
| Home Installations - Distance between Actual and Captured Point | `fldytYuAV1fFCafqq` | number |  |
| Last Modified Home Installations By | `fldZy2EzkD1s4YePc` | multilineText |  |
| Last Modified Home Installations Date | `fldgZhNWzIFNsLcEH` | dateTime |  |
| Marketing Activator Name | `fldoeTzNoEjbkiabg` | multilineText |  |
| Marketing Activator Surname | `fldGjc0WzPmiEy8Wj` | multilineText |  |
| Has the client been taught where and how to buy a fibertime vou | `fldgHUfVskFAT3ZVM` | multilineText |  |
| Number of Cellphone number linked to fibertime network | `fldIDuU5cdoKmbBoj` | multilineText |  |
| Has a profile been created in the fibertime.app for all users c | `fldYwLRkoK3I0VIuK` | multilineText |  |
| What was the quality of the installation? | `fldIaGnLEUuLk9o0v` | multilineText |  |
| Has the client been informed how to log a support ticket on Wha | `fldvpORmUdVhi2vGX` | multilineText |  |
| notes | `fldCj5OKkNNTvv5TE` | multilineText |  |
| status_dc | `fldbs8ZTlBOxf6kxh` | multilineText |  |
| Sales - Actual Device Location (Latitude) | `fld9k4ftf6ii2jydi` | multilineText |  |
| Sales - Actual Device Location (Longitude) | `fldZq5MVbJTB84fIW` | multilineText |  |
| Sales - Distance between Actual and Captured Point | `fldbQZ5s1BX6c9UvM` | multilineText |  |
| How much do you spend on Mobile data each month? | `fldi9kKidAnPToLww` | multilineText |  |
| inthme | `fldnnHxtucVUE7c0i` | multilineText |  |
| Would you like fibertime? | `fldw1oGKrQVOQgxct` | multilineText |  |
| Field Agent Name & Surname(sales) | `fldZPzAAKoyOi6qSB` | multilineText |  |
| Awareness - Actual Device Location (Latitude) | `fld1nKAQGbCPKJ8to` | multilineText |  |
| Awareness - Actual Device Location (Longitude) | `fldjETh3f3sKY6EXG` | multilineText |  |
| Awareness - Distance between Actual and Captured Point | `fldXJWEqff9qRO2aY` | multilineText |  |
| spare_dr | `fldgqSfHOIW9ZrDvf` | multilineText |  |
| Estimated horizontal accuracy radius in meters | `fld85JwCSVs5BnmaT` | multilineText |  |
| Pole Permissions - Estimated horizontal accuracy radius in mete | `fldTUpPfzOqjYSSSx` | multilineText |  |
| Home Sign Ups - Estimated horizontal accuracy radius in meters | `fld40PnJMYTguUlFb` | multilineText |  |
| Home Installations - Estimated horizontal accuracy radius in me | `fldqcnYElPlegPy6A` | multilineText |  |
| Sales - Estimated horizontal accuracy radius in meters | `fldTtqjBuMdJx4yfz` | multilineText |  |
| Awareness - Estimated horizontal accuracy radius in meters | `fldqW3kEfZBf6kMan` | multilineText |  |
| 1map NAD ID | `flde1bgTqnOB7hTK4` | number |  |
| Job ID | `fldoAwX77KtXvSgb0` | multilineText |  |
| Daily Tracker | `fldawxJieQEQMNmqZ` | singleLineText |  |
| Projects | `fldqIZ6jNv2hLpcDu` | multipleRecordLinks → Projects |  |
| Projects 2 | `fldsYFkI6mieNWMhN` | multipleRecordLinks → Projects |  |
| Poles Lawley | `fldXAfaAFWToGxDw6` | singleLineText |  |

#### Views

- **Grid view** (`viwkM0OqHH0U7VYau`) - grid

### Raw Mohadin
- **Table ID**: `tblsNLRJZrhC3dA13`
- **Primary Field**: Property ID

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Property ID | `fldlIs4iXQoM3xp5f` | number |  |
| Date Status Changed | `fldPXRsU2b9du2lXQ` | dateTime |  |
| Status | `fldrzg6n1EP3Ucq4M` | singleSelect (Pole Permission: Approved, Missing, Home Sign Ups: Approved & Installation Scheduled, Home Sign Ups: Declined, Home Installation: Installed...) |  |
| Permissions # | `fldo05KadwVNNx8Ho` | formula | Counts the number of records where the Status field is 'Pole Permission: Approved' |
| Missing # | `fldK24rcXIdA5V3wd` | formula |  |
| Sign-up Approved | `fldPGk4IsRBfjAIxa` | formula |  |
| Flow Name Groups | `fldYWgOfOIFbPNtMq` | multilineText |  |
| Site | `fldt8fNE51h44Z4CG` | singleSelect (LAWLEY, Mohadin, Site, Lawley, MOA) |  |
| Sections | `fldFWZWppNDLWnXmq` | number |  |
| PONs | `fldummgb879oM6vPh` | singleSelect (C4P14, C4P11, C4P6, , C4P5...) |  |
| Location Address | `fldeg9hsHVGhDs3xq` | multilineText |  |
| Actual Device Location (Latitude) | `fldvwK3FpJgE8cnyQ` | number |  |
| Actual Device Location (Longitude) | `fldMjRnCNjs82nVlz` | number |  |
| Distance between Actual and Captured Point | `fld5goZqNXtngmdb0` | number |  |
| lst_mod_by | `fldiKOi2xH4A1METy` | singleSelect (ftlawhh1@fibertime.com, ftlawhh2@fibertime.com, ftlawhh6@fibertime.com, ftlawhh7@fibertime.com, ftlawhh10@fibertime.com...) |  |
| lst_mod_dt | `fldYlUPRv9Ip8h67A` | dateTime |  |
| Pole Number | `fld607srNUdZZQRRi` | multilineText |  |
| Drop Number | `fldne62DWoWaTSNxC` | multilineText |  |
| Language | `fldJNVnrYbPEpbE07` | singleSelect (English, , Tshivenda, isiZulu, isiXhosa...) |  |
| Survey Date | `fldJckQ1lLZxfxX4K` | dateTime |  |
| CONSENT FORM PERSONAL DETAILS OF THE PERSON SIGNING THIS FORM ( | `fldOJEozYUsol9WIU` | multilineText |  |
| UXWEBHU lwesivumelwano IINKUKACHA ZOMNTU OTYIKITYA OLUXWEBHU ( | `fld3LFL9bTaw5lZlc` | multilineText |  |
| Address Validation | `fldKw60JaeDPMM8f4` | multilineText |  |
| Stand Number | `fldwSOAvNpLdY9Cjl` | multilineText |  |
| Latitude & Longitude | `fldsesAjyGx9NE5b4` | multilineText |  |
| CONSENT TO PLANT A POLE | `flduEancGP656o8FO` | multilineText |  |
| ISIVUMELWANO SOKUTYALWA KWEPALI | `fld9Xdj1fhsjRYonP` | multilineText |  |
| Owner or Tenant | `flddVgrM0Jk4XudDF` | singleSelect (Owner, Tenant, , Owner or Tenant) |  |
| Special Conditions (if any) | `fldcmHKitwRFcAwvh` | singleSelect (, none, bricks to b3 removed) |  |
| Field Agent Name (pole permission) | `fldJtSORFzWpHcJRL` | singleSelect (manuel, nathan, marchael, Manuel, Adrian...) |  |
| Date of Signature | `fldIbTXDuuaaDsYIF` | dateTime |  |
| Latitude | `fldoAljOWQjjtb4ag` | number |  |
| Longitude | `fld98r45ibvkIQDz0` | number |  |
| Pole Permissions - Actual Device Location (Latitude) | `fldJCgIRm1A7dTOni` | number |  |
| Pole Permissions - Actual Device Location (Longitude) | `fld51qEkDATtumpy1` | number |  |
| Pole Permissions - Distance between Actual and Captured Point | `fldY0cCXwSrQpwoo0` | number |  |
| Last Modified Pole Permissions By | `fldz0dD9RvRTTQKXc` | singleSelect (ftlawhh1@fibertime.com, ftlawhh2@fibertime.com, ftlawhh6@fibertime.com, ftlawhh7@fibertime.com, ...) |  |
| Last Modified Pole Permissions Date | `fldzmxdxnXtzJcNNV` | dateTime |  |
| Access to Property | `fldRY3dwwhe5HNWuq` | singleSelect (, Yes, No) |  |
| Declined | `fldDDf78gFwFrOux9` | singleSelect (, No, Yes) |  |
| if Yes, Reason Why it was Declined | `fldqCeS0DgAYetlMU` | singleSelect (, Illegal Electrical connection, Not interested - I don't want fiber internet at my home, Not interested - I have home internet with another provider, Damaged/Vandalised Property) |  |
| Primary House of Backyard Dwelling | `fldGiPOSaaevFISvR` | singleSelect (, Primary House, Backyard Dwelling) |  |
| Number of People Living in the Home | `fld1zZAGLn9e1DRAr` | number |  |
| Residential or Commercial Dwelling | `fld07VTUQh9KLXt34` | singleSelect (, Residential, Commercial) |  |
| Mark Type of Commercial if Applicable | `fldEWQusGXOwoaarM` | singleSelect (, Spaza shop) |  |
| How do you access internet at your home currently? | `fldgATNyRPctyVQdd` | singleSelect (, Other, Rain, Vodacom MTN Cell C or Telkom) |  |
| Backyard Dwellings | `fldOuDfPvd8fEtuIw` | singleSelect (, Yes, No) |  |
| If Yes, How Many Dwellings | `fldOOwrVaRpaVmp7G` | number |  |
| if Yes, How Many People | `fldrZnfnWDvop3RHG` | number |  |
| If Yes, Structure of Backyard Dwelling | `fldvA5DACfe0QMEBL` | singleSelect (, Brick and Mortar, Zinc, Wood) |  |
| Consent Form | `fld4qtHojZtWcgPTH` | multilineText |  |
| House Number | `fldAK6XamgDSL1yxU` | multilineText |  |
| I hereby consent that I have a permanent Municipal electrical c | `fldI50hSmQrX7pzLf` | number |  |
| Preferred Place for Router Installation in Home | `fldHY3K24GdeHb5MZ` | singleSelect (, Living Room, Family Room, Dining Room, Bedroom 2...) |  |
| Number of Sticker Placed on Door | `fldEZSrf09B2nto3r` | multilineText |  |
| Photo of Property | `fld2DthvrQZf7s5fn` | number |  |
| General Comments | `fldRUR4r1Hp3IzzzH` | multilineText |  |
| Field Agent Name (Home Sign Ups) | `fldOFmqGBhcmej7Ur` | singleSelect (, palesa, Vinolia Mokwatsi, Sylvia Mogotlwane, Wian...) |  |
| Home Sign Ups - Actual Device Location (Latitude) | `fld0k1MlB3hUEqgzt` | multilineText |  |
| Home Sign Ups - Actual Device Location (Longitude) | `fldAtl0sqP4S7gWMq` | multilineText |  |
| Home Sign Ups - Distance between Actual and Captured Point | `fldMdZvoHze7p12Wc` | number |  |
| Last Modified Home Sign Ups By | `fld7FNG1l8li4l3LJ` | singleSelect (, ftlawhh18@fibertime.com, ftlawhh14@fibertime.com, ftlawhh16@fibertime.com, godfrey@fibertime.com...) |  |
| Last Modified Home Sign Ups Date | `fld0pYHMAIj8EhlLN` | dateTime |  |
| Nokia Easy Start ONT Activation Code | `fldKGTmWSq8HaQlWT` | multilineText |  |
| ONT activation light level | `flds9tA3B4rsLMMPJ` | multilineText |  |
| Record any Relevant Comments | `fldEXR5x4T0jcHc2x` | multilineText |  |
| Powermeter reading (at dome) | `fld7ASnwmkeSLKC5f` | number |  |
| Patched and labelled drop | `flduQeJhiMcz2GzKL` | multilineText |  |
| Photo of Splitter Tray in Dome Joint (front side) | `fld78p8xKzaXRh8Dc` | number |  |
| Photo of Connection Points in the BB/Handhole (other side of jo | `fldlrcYcFlNyXXv8Y` | multilineText |  |
| Photo of the Handhole Before Closing | `fldgbNxPAa0naT8ea` | multilineText |  |
| Photo of the Handhole After Closing | `fldMMBP5Reaeyapq6` | multilineText |  |
| Photo Showing Location on the Wall (before installation) | `fldwo1Pl1FlLji8Sv` | number |  |
| Home Entry Point: Outside (Pigtail screw / Duct entry) | `fld41F9SlrTN7xNmY` | number |  |
| Home entry point | `fldAFozemSpZAVkIX` | multilineText |  |
| Outside cable span: Pole to Pigtail screw | `fldJr22mESds5SJW5` | multilineText |  |
| ONT Barcode | `fldeDSEtWH1KJ7sJ3` | number |  |
| Mini-UPS Serial Number | `fldxp5Xd4WWnIgl6o` | number |  |
| Photo of Active Broadband Light (with FT sticker and Drop Numbe | `fldScNxkCAXtCm6yX` | multilineText |  |
| Powermeter reading (at ONT before activation) | `fldiIv6VqYumfOObp` | multilineText |  |
| Fiber cable: entry to ONT (after install) | `fldBFCDrJzN51gEtm` | number |  |
| Record Relevant Comments | `fldUKUIRv5pse0ex8` | multilineText |  |
| Any Damages to be Reported | `fldWFZZdr7GpmeRxk` | multilineText |  |
| If there are, Please Specify | `fldqU0cmuteGSjvaQ` | multilineText |  |
| Overall work area after complete install: including ONT and fib | `fld6EsJH7xS4KdmHv` | multilineText |  |
| Dome Joint Number / BB | `fldJ4e4MREVoogpDj` | multilineText |  |
| Length of Drop Cable | `fld6rtPdPcJu1qBr5` | multilineText |  |
| Client happy with Installation | `fldU1jXhVzsYrnXvq` | multilineText |  |
| Read English Terms and Conditions | `fldNOFwqTEwLIrwjw` | multilineText |  |
| Read Xhosa Terms and Conditions | `fldHmZWhR60gzT4jU` | multilineText |  |
| Installer Name | `fldow8qBQj4kyYSpl` | singleSelect (, gk, wian) |  |
| Home Installations - Actual Device Location (Latitude) | `fld0q8CSNGRJ2xP7x` | number |  |
| Home Installations - Actual Device Location (Longitude) | `fldqRdn2jOmKllfHp` | number |  |
| Home Installations - Distance between Actual and Captured Point | `fldscKyKdtCQhpfi2` | number |  |
| Last Modified Home Installations By | `fldThOIJC5oDJdeHO` | multilineText |  |
| Last Modified Home Installations Date | `fldaI3R6Ra2Y70cwj` | dateTime |  |
| Marketing Activator Name | `fldiXFDXG6GmZxa3S` | multilineText |  |
| Marketing Activator Surname | `fldA2Y46RhJtjN8OV` | multilineText |  |
| Has the client been taught where and how to buy a fibertime vou | `fldaqGj5KM2LyiZNo` | multilineText |  |
| Number of Cellphone number linked to fibertime network | `fldCmgYfuFLV1qBgV` | multilineText |  |
| Has a profile been created in the fibertime.app for all users c | `fldSfxVuGcqTFaImm` | multilineText |  |
| What was the quality of the installation? | `fldCTsrVWmRWZooS7` | multilineText |  |
| Has the client been informed how to log a support ticket on Wha | `fldp8AVwcFisXhvyz` | multilineText |  |
| notes | `fldw2RSUCfa4aK5Lg` | multilineText |  |
| status_dc | `fld5bU33D3bIUlkpT` | multilineText |  |
| Sales - Actual Device Location (Latitude) | `fld33QjDxyFtHyy5U` | multilineText |  |
| Sales - Actual Device Location (Longitude) | `fldT9RQ5tbgMNjfAy` | multilineText |  |
| Sales - Distance between Actual and Captured Point | `fld5zL9Cj3khRoUno` | multilineText |  |
| How much do you spend on Mobile data each month? | `fldcS6Osv2K0yDLo8` | multilineText |  |
| inthme | `fldh6tBDMEi5jmcSU` | multilineText |  |
| Would you like fibertime? | `fldqKaKUJiiZvvx45` | multilineText |  |
| Field Agent Name & Surname(sales) | `fldTylEK2QVZXlqKd` | multilineText |  |
| Awareness - Actual Device Location (Latitude) | `fldV6wE0YDZ0pY8l0` | multilineText |  |
| Awareness - Actual Device Location (Longitude) | `flddnFldxvPVDlEPi` | multilineText |  |
| Awareness - Distance between Actual and Captured Point | `fldRsIIAxHwBw322A` | multilineText |  |
| spare_dr | `flda9EjR6ajkEGDnR` | multilineText |  |
| Estimated horizontal accuracy radius in meters | `fld2OvAManPggCm2v` | multilineText |  |
| Pole Permissions - Estimated horizontal accuracy radius in mete | `fldNDbTpRgNuD7SK9` | multilineText |  |
| Home Sign Ups - Estimated horizontal accuracy radius in meters | `fldYJBrT4qgr99lxN` | multilineText |  |
| Home Installations - Estimated horizontal accuracy radius in me | `fldkV92ODhIpV4yYc` | multilineText |  |
| Sales - Estimated horizontal accuracy radius in meters | `fldNccnLMeAUcjy7b` | multilineText |  |
| Awareness - Estimated horizontal accuracy radius in meters | `fldkFPoOxrYqLzM2Z` | multilineText |  |
| 1map NAD ID | `fld8KXk3IPbMMwTCG` | number |  |
| Job ID | `fldiji1hpcQ8a7g3C` | multilineText |  |
| Daily Tracker | `fld4fjNswi11r2miB` | singleLineText |  |
| Projects | `fldkrLat5XpsqEcv6` | multipleRecordLinks → Projects |  |

#### Views

- **Grid view** (`viwevMSAZ9n5MaY26`) - grid

### Lawley Pole #
- **Table ID**: `tblzk59ArVyv5dAW0`
- **Primary Field**: Pole Number

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Pole Number | `fldVIjccAxmZh73sy` | multilineText |  |
| Property ID | `fldgY5S6TTh0NJ9jX` | number |  |
| Lawley Pole Tracker | `fldvmrbxKWpKxTf0s` | multipleRecordLinks → Lawley Pole Tracker |  |
| Lawley Pole Tracker copy | `fldnL1jI0dnSqX1YE` | singleLineText |  |

#### Views

- **Grid view** (`viwzFyV8s13tgQh7s`) - grid

### Mohadin Pole #
- **Table ID**: `tbl4mybGyOTxP1p9d`
- **Primary Field**: Pole Number

#### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Pole Number | `fldqKMeiHqH11VSFL` | multilineText |  |
| Property ID | `fldL0yUc0MC2xxYwa` | number |  |
| Mohadin Pole Tracker | `fldA5APWM4lmM0ufD` | multipleRecordLinks → Mohadin Pole Tracker |  |

#### Views

- **Grid view** (`viw4H1XezUov0E6kF`) - grid

## Table Relationships

```mermaid
graph TD
    Customers -->|Assigned Projects| Projects
    Customers -->|WIP Projects| Projects
    Customers -->|Contacts| Contacts
    Projects -->|Customer| Customers
    Projects -->|Province| Provinces
    Projects -->|Regional PM| Staff
    Projects -->|Project Manager| Staff
    Projects -->|Linked Phases| Step
    Projects -->|Daily Reports| Daily Tracker
    Projects -->|SHEQ| SHEQ
    Projects -->|Contractors| Contractors
    Projects -->|Issues and Risks| Issues and Risks
    Projects -->|Monthly Reports| Weekly Reports
    Projects -->|Contractor Performance| KPI - Elevate
    Projects -->|Raw Data Link| Raw Lawley
    Projects -->|Locations| Locations
    Projects -->|Customers| Customers
    Projects -->|Deliverables1| BOQ
    Projects -->|Raw Data copy| Raw Lawley
    Projects -->|Raw Lawley copy| Raw Mohadin
    Contacts -->|Linked Staff| Staff
    Contacts -->|Linked Supplier| Suppliers
    Contacts -->|Linked Client| Customers
    Contacts -->|Contractors 2| Contractors
    Contacts -->|Contractors 4| Contractors
    Step -->|Project| Projects
    Step -->|Task Template| Task Template
    BOQ -->|Project| Projects
    BOQ -->|Task Template| Task Template
    Task Template -->|Step| Step
    Task Template -->|BOQ| BOQ
    Stock Categories -->|Stock Items| Stock Items
    Stock Categories -->|Stock Items copy| Stock On Hand
    Suppliers -->|Contact Person/s| Contacts
    Staff -->|Assigned Projects| Projects
    Staff -->|SHEQ| SHEQ
    Staff -->|Issues and Risks| Issues and Risks
    Staff -->|Projects 2| Projects
    Staff -->|Contacts| Contacts
    Staff -->|Poles Lawley| Lawley Pole Tracker
    Staff -->|Lawley Pole Tracker copy| Mohadin Pole Tracker
    Contractors -->|Province| Provinces
    Contractors -->|Region(s) of Operation| Provinces
    Contractors -->|Main Contact| Contacts
    Contractors -->|SHEQ Documentation (SHE Plans, Safety Files, etc.)| SHEQ
    Contractors -->|Mobile Number| Contacts
    Contractors -->|SHEQ| SHEQ
    Contractors -->|Daily Tracker| Daily Tracker
    Contractors -->|Projects| Projects
    Contractors -->|Poles Lawley| Lawley Pole Tracker
    Contractors -->|Lawley Pole Tracker copy| Mohadin Pole Tracker
    Daily Tracker -->|Project| Projects
    Daily Tracker -->|Contractor| Contractors
    Daily Tracker -->|Contractor Performance| KPI - Elevate
    Daily Tracker -->|KPI - Elevate| KPI - Elevate
    Daily Tracker -->|Monthly Reports| Weekly Reports
    Weekly Reports -->|Project| Projects
    Weekly Reports -->|Attached Daily Reports| Daily Tracker
    Lawley Pole Tracker -->|Pole Number| Lawley Pole #
    Lawley Pole Tracker -->|Contractor| Contractors
    Lawley Pole Tracker -->|Quality Checked by:| Staff
    Mohadin Pole Tracker -->|Pole Number| Mohadin Pole #
    Mohadin Pole Tracker -->|Contractor| Contractors
    Mohadin Pole Tracker -->|Quality Checked by:| Staff
    Stock Items -->|Item Category| Stock Categories
    Stock On Hand -->|Item Category| Stock Categories
    Stock On Hand -->|Stock Movements| Stock Movements
    SHEQ -->|Contractor| Contractors
    SHEQ -->|Related Project| Projects
    SHEQ -->|Issues| Issues and Risks
    SHEQ -->|Officer| Staff
    SHEQ -->|Contractors| Contractors
    Stock Movements -->|Stock Item| Stock On Hand
    Stock Movements -->|Project Location| Locations
    Issues and Risks -->|Project| Projects
    Issues and Risks -->|Assigned Staff| Staff
    Issues and Risks -->|SHEQ| SHEQ
    Provinces -->|Projects| Projects
    Provinces -->|Contractors 2| Contractors
    Provinces -->|Contractors 3| Contractors
    Locations -->|Project| Projects
    Locations -->|Stock Movements 2| Stock Movements
    KPI - Elevate -->|Date| Daily Tracker
    KPI - Elevate -->|Project| Projects
    KPI - Elevate -->|Daily Tracker Link| Daily Tracker
    Raw Lawley -->|Projects| Projects
    Raw Lawley -->|Projects 2| Projects
    Raw Mohadin -->|Projects| Projects
    Lawley Pole # -->|Lawley Pole Tracker| Lawley Pole Tracker
    Mohadin Pole # -->|Mohadin Pole Tracker| Mohadin Pole Tracker
```

## Migration Priority Tables

### High Priority (Core Business Data)
1. **Customers** - Core client data
2. **Projects** - Project management
3. **Daily Tracker** - Progress tracking
4. **Staff** - Personnel management
5. **Contractors** - Contractor management

### Medium Priority (Supporting Data)
6. **SHEQ** - Safety and compliance
7. **Issues and Risks** - Risk management
8. **Contacts** - Contact management
9. **BOQ** - Bill of Quantities
10. **Task** - Task tracking

### Low Priority (Reference/Derived Data)
11. **Provinces** - Geographic reference
12. **Locations** - Location reference
13. **Weekly Reports** - Aggregated reports
14. **Meeting Summaries** - Meeting records

