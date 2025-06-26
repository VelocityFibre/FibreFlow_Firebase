# Airtable Schema Analysis Report

Generated: 2025-06-26T10:05:59.800Z

## Summary
- Total Tables: 31
- Total Relationships: 90
- Complex Fields: 50

## Field Type Distribution
- multilineText: 165
- singleSelect: 101
- singleLineText: 93
- multipleRecordLinks: 90
- number: 84
- multipleAttachments: 36
- multipleLookupValues: 27
- rollup: 26
- aiText: 25
- formula: 24
- dateTime: 14
- date: 12
- checkbox: 5
- count: 4
- phoneNumber: 4
- email: 4
- autoNumber: 4
- singleCollaborator: 2
- lastModifiedTime: 2
- lastModifiedBy: 2
- currency: 2
- multipleSelects: 1
- rating: 1

## Table Dependencies
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

## Migration Order
1. **Task** (7 fields)
2. **Master Material List** (9 fields)
3. **Drawdowns** (9 fields)
4. **Test** (6 fields)
5. **Meeting Summaries** (6 fields)
6. **Issues and Risks** (17 fields)
7. **SHEQ** (15 fields)
8. **Lawley Pole #** (4 fields)
9. **Lawley Pole Tracker** (32 fields)
10. **Mohadin Pole #** (3 fields)
11. **Mohadin Pole Tracker** (32 fields)
12. **Staff** (22 fields)
13. **Suppliers** (17 fields)
14. **Contacts** (13 fields)
15. **KPI - Elevate** (18 fields)
16. **Weekly Reports** (7 fields)
17. **Daily Tracker** (33 fields)
18. **Contractors** (64 fields)
19. **Provinces** (5 fields)
20. **BOQ** (9 fields)
21. **Task Template** (8 fields)
22. **Step** (10 fields)
23. **Raw Lawley** (128 fields)
24. **Stock Items** (6 fields)
25. **Stock Categories** (4 fields)
26. **Stock On Hand** (13 fields)
27. **Stock Movements** (10 fields)
28. **Locations** (5 fields)
29. **Raw Mohadin** (126 fields)
30. **Projects** (79 fields)
31. **Customers** (11 fields)

## Key Tables Analysis

### Customers
- Primary Field: Client Name
- Total Fields: 11
- Linked Tables: Projects, Projects, Contacts
- Rollup Fields: 0
- Formula Fields: 0

### Projects
- Primary Field: Project Name
- Total Fields: 79
- Linked Tables: Customers, Provinces, Staff, Staff, Step, Daily Tracker, SHEQ, Contractors, Issues and Risks, Weekly Reports, KPI - Elevate, Raw Lawley, Locations, Customers, BOQ, Raw Lawley, Raw Mohadin
- Rollup Fields: 13
- Formula Fields: 13

### Daily Tracker
- Primary Field: Date
- Total Fields: 33
- Linked Tables: Projects, Contractors, KPI - Elevate, KPI - Elevate, Weekly Reports
- Rollup Fields: 0
- Formula Fields: 2

### Staff
- Primary Field: Name
- Total Fields: 22
- Linked Tables: Projects, SHEQ, Issues and Risks, Projects, Contacts, Lawley Pole Tracker, Mohadin Pole Tracker
- Rollup Fields: 1
- Formula Fields: 0

### Contractors
- Primary Field: Company Registered Name
- Total Fields: 64
- Linked Tables: Provinces, Provinces, Contacts, SHEQ, Contacts, SHEQ, Daily Tracker, Projects, Lawley Pole Tracker, Mohadin Pole Tracker
- Rollup Fields: 0
- Formula Fields: 0

## Migration Challenges
- Rollup fields need to be recalculated in Firebase
- Formula fields need to be implemented as Cloud Functions

## Complex Fields Requiring Transformation
- Projects.End Date (formula)
- Projects.Permissions Complete (rollup)
- Projects.Permissions Missing (rollup)
- Projects.Permissions Declined (rollup)
- Projects.Permissions % (formula)
- Projects.Poles to Plant BOQ (formula)
- Projects.Poles Planted (rollup)
- Projects.Poles Planted % (formula)
- Projects.Home Sign-ups (rollup)
- Projects.Home Sign-Ups % (formula)
- Projects.Home Drops (rollup)
- Projects.Home Drops % (formula)
- Projects.Homes Connected (rollup)
- Projects.Homes Connected % (formula)
- Projects.Stringing BOQ (formula)
- Projects.Stringing Complete (formula)
- Projects.Total Stringing % (formula)
- Projects.24F Complete (rollup)
- Projects.48F Complete (rollup)
- Projects.96F Complete (rollup)
