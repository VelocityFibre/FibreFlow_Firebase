# SOW Module - Integration Test Scenarios

## Overview
This document outlines comprehensive integration test scenarios for the SOW module with existing FibreFlow modules. Each scenario includes test setup, expected behavior, and validation criteria.

## Integration Points Map

```
SOW Module integrates with:
├── Projects Module (Primary)
├── Daily Progress Module  
├── Firebase Services
│   ├── Firestore
│   ├── Storage
│   └── Auth
├── Neon PostgreSQL
├── Theme System
├── Audit Trail
└── Error Handling (Sentry)
```

## Test Scenarios by Module

### 1. Projects Module Integration

#### Test 1.1: SOW Import During Project Creation
```typescript
describe('Project Creation with SOW Import', () => {
  it('should populate KPI targets from SOW calculations', async () => {
    // Setup
    const projectData = {
      name: 'Test Project',
      client: 'Test Client',
      location: 'Lawley'
    };
    
    const sowFiles = {
      poles: createMockExcelFile('poles.xlsx', mockPoleData),
      drops: createMockExcelFile('drops.xlsx', mockDropData),
      fibre: createMockExcelFile('fibre.xlsx', mockFibreData)
    };
    
    // Execute
    await projectForm.fillBasicInfo(projectData);
    await projectForm.navigateToSOWStep();
    await sowImport.uploadFiles(sowFiles);
    await sowImport.processAndValidate();
    const calculations = await sowImport.getCalculations();
    
    // Verify
    expect(projectForm.kpiTargets).toEqual({
      polePermissions: {
        total: calculations.totals.polePermissionsTotal,
        daily: calculations.dailyTargets.polePermissionsDaily
      },
      homeSignups: {
        total: calculations.totals.homeSignupsTotal,
        daily: calculations.dailyTargets.homeSignupsDaily
      }
      // ... other targets
    });
    
    // Save and verify in Firestore
    const projectId = await projectForm.save();
    const savedProject = await projectService.get(projectId);
    
    expect(savedProject.metadata.kpiTargets).toBeDefined();
    expect(savedProject.metadata.sowId).toBeDefined();
  });
  
  it('should handle SOW import errors gracefully', async () => {
    // Test with invalid files
    const invalidFiles = {
      poles: createMockExcelFile('poles.xlsx', []), // Empty file
      drops: createMockExcelFile('drops.xlsx', invalidDropData)
    };
    
    await sowImport.uploadFiles(invalidFiles);
    const validation = await sowImport.validate();
    
    expect(validation.hasErrors).toBe(true);
    expect(projectForm.canProceed()).toBe(false);
    expect(projectForm.showsSOWErrors()).toBe(true);
  });
});
```

#### Test 1.2: SOW Import from Project Detail
```typescript
describe('SOW Import from Existing Project', () => {
  it('should update existing project with SOW data', async () => {
    // Setup - Create project without SOW
    const project = await createTestProject({ hasSOW: false });
    
    // Navigate to project detail
    await navigateTo(`/projects/${project.id}`);
    await projectDetail.clickImportSOW();
    
    // Import SOW
    await sowImport.uploadFiles(validSOWFiles);
    await sowImport.complete();
    
    // Verify updates
    const updatedProject = await projectService.get(project.id);
    expect(updatedProject.metadata.kpiTargets).toBeDefined();
    expect(updatedProject.metadata.sowId).toBeDefined();
    
    // Verify UI updates
    expect(projectDetail.showsKPITargets()).toBe(true);
    expect(projectDetail.kpiTargets).toMatchObject({
      polePermissions: { total: 500, daily: 10 }
    });
  });
});
```

### 2. Daily Progress Module Integration

#### Test 2.1: Daily Progress Validation Against SOW
```typescript
describe('Daily Progress SOW Validation', () => {
  it('should validate daily entries against SOW targets', async () => {
    // Setup project with SOW
    const project = await createProjectWithSOW({
      dailyTargets: {
        polePermissionsDaily: 10,
        homeSignupsDaily: 6
      }
    });
    
    // Create daily progress entry
    await navigateTo(`/daily-progress/new?projectId=${project.id}`);
    
    // Enter values exceeding targets
    await dailyProgressForm.enterValues({
      polePermissions: 15, // Exceeds daily target of 10
      homeSignups: 8       // Exceeds daily target of 6
    });
    
    // Verify warnings
    expect(dailyProgressForm.showsWarning('polePermissions')).toBe(true);
    expect(dailyProgressForm.warningMessage('polePermissions'))
      .toContain('Exceeds daily target of 10');
    
    // Can still save with confirmation
    await dailyProgressForm.save({ confirmExceedTarget: true });
    expect(await dailyProgressForm.isSaved()).toBe(true);
  });
  
  it('should calculate cumulative progress against SOW totals', async () => {
    // Setup
    const project = await createProjectWithSOW({
      totals: { polePermissionsTotal: 100 }
    });
    
    // Add multiple daily entries
    await createDailyProgress(project.id, { polePermissions: 10 });
    await createDailyProgress(project.id, { polePermissions: 15 });
    await createDailyProgress(project.id, { polePermissions: 20 });
    
    // Check cumulative progress
    const progress = await dailyProgressService.getCumulativeProgress(project.id);
    
    expect(progress.polePermissions).toEqual({
      achieved: 45,
      target: 100,
      percentage: 45,
      remaining: 55,
      daysAtCurrentRate: 5.5
    });
  });
});
```

#### Test 2.2: SOW-Based Progress Reports
```typescript
describe('Progress Reports with SOW Data', () => {
  it('should generate variance reports', async () => {
    const project = await createProjectWithSOW();
    
    // Add week of progress
    for (let i = 0; i < 7; i++) {
      await createDailyProgress(project.id, {
        polePermissions: 8, // Below target of 10
        homeSignups: 7     // Above target of 6
      });
    }
    
    // Generate report
    const report = await reportService.generateWeeklyReport(project.id);
    
    expect(report.variance).toEqual({
      polePermissions: {
        target: 70,
        actual: 56,
        variance: -14,
        percentage: -20
      },
      homeSignups: {
        target: 42,
        actual: 49,
        variance: 7,
        percentage: 16.7
      }
    });
  });
});
```

### 3. Firebase Integration Tests

#### Test 3.1: Firestore Operations
```typescript
describe('SOW Firestore Integration', () => {
  it('should save SOW data with proper structure', async () => {
    const sowData = await sowService.create(mockSOWData);
    
    // Verify in Firestore
    const doc = await firestore
      .collection('sows')
      .doc(sowData.id)
      .get();
    
    expect(doc.exists).toBe(true);
    expect(doc.data()).toMatchObject({
      projectId: mockSOWData.projectId,
      createdAt: expect.any(Timestamp),
      calculations: expect.objectContaining({
        totals: expect.any(Object),
        dailyTargets: expect.any(Object)
      })
    });
  });
  
  it('should handle concurrent SOW updates', async () => {
    const sowId = await createTestSOW();
    
    // Simulate concurrent updates
    const update1 = sowService.update(sowId, { estimatedDays: 60 });
    const update2 = sowService.update(sowId, { estimatedDays: 55 });
    
    await Promise.all([update1, update2]);
    
    // Verify last write wins
    const final = await sowService.get(sowId);
    expect(final.calculations.dailyTargets.estimatedDays).toBe(55);
  });
});
```

#### Test 3.2: Firebase Storage Integration
```typescript
describe('SOW File Storage', () => {
  it('should upload Excel files to Firebase Storage', async () => {
    const files = {
      poles: createMockExcelFile('poles.xlsx', mockPoleData),
      drops: createMockExcelFile('drops.xlsx', mockDropData)
    };
    
    const sowId = await sowService.createWithFiles(mockProjectId, files);
    const sow = await sowService.get(sowId);
    
    // Verify storage URLs
    expect(sow.files.poles.storageUrl).toMatch(/^gs:\/\/.*\/sow-imports\//);
    expect(sow.files.drops.storageUrl).toMatch(/^gs:\/\/.*\/sow-imports\//);
    
    // Verify files are accessible
    const polesUrl = await getDownloadURL(sow.files.poles.storageUrl);
    const response = await fetch(polesUrl);
    expect(response.ok).toBe(true);
  });
  
  it('should handle storage quota errors', async () => {
    // Simulate large file
    const largeFile = createMockExcelFile('huge.xlsx', 
      new Array(1000000).fill(mockPoleData[0])
    );
    
    await expect(
      sowService.uploadFile('test', largeFile)
    ).rejects.toThrow('Storage quota exceeded');
  });
});
```

### 4. Neon PostgreSQL Integration

#### Test 4.1: Auto-sync to Neon
```typescript
describe('SOW Neon Sync', () => {
  it('should sync SOW data to Neon via Functions', async () => {
    // Create SOW in Firebase
    const sowId = await sowService.create(mockSOWData);
    
    // Wait for Function trigger
    await waitForFunctionExecution('syncSowToNeon', 5000);
    
    // Verify in Neon
    const neonResult = await neonDb.query(`
      SELECT * FROM sow_imports WHERE firebase_id = $1
    `, [sowId]);
    
    expect(neonResult.rows).toHaveLength(1);
    expect(neonResult.rows[0]).toMatchObject({
      project_id: mockSOWData.projectId,
      total_poles: mockSOWData.calculations.totals.polePermissionsTotal,
      total_drops: mockSOWData.calculations.totals.totalDrops
    });
  });
  
  it('should sync detailed pole/drop data', async () => {
    const sowId = await sowService.createWithDetails(mockSOWData, {
      poles: mockPoleData,
      drops: mockDropData
    });
    
    await waitForFunctionExecution('syncSowDetailsToNeon', 5000);
    
    // Verify poles
    const poles = await neonDb.query(`
      SELECT COUNT(*) FROM sow_poles WHERE sow_import_id = 
      (SELECT id FROM sow_imports WHERE firebase_id = $1)
    `, [sowId]);
    
    expect(poles.rows[0].count).toBe(mockPoleData.length.toString());
  });
});
```

### 5. Theme System Integration

#### Test 5.1: Theme Compatibility
```typescript
describe('SOW Theme Integration', () => {
  const themes = ['light', 'dark', 'vf', 'fibreflow'];
  
  themes.forEach(theme => {
    it(`should render correctly in ${theme} theme`, async () => {
      await themeService.setTheme(theme);
      await navigateTo('/sow/import');
      
      // Check contrast ratios
      const uploadZone = await page.$('.upload-zone');
      const contrast = await getContrastRatio(uploadZone);
      expect(contrast).toBeGreaterThan(4.5); // WCAG AA
      
      // Check theme variables
      const styles = await getComputedStyles('.sow-import-container');
      expect(styles.backgroundColor).toBe(`var(--ff-background)`);
      expect(styles.color).toBe(`var(--ff-foreground)`);
    });
  });
  
  it('should handle theme switching during import', async () => {
    await sowImport.startImport();
    await sowImport.uploadFile('poles', mockFile);
    
    // Switch theme mid-import
    await themeService.setTheme('dark');
    
    // Verify UI updates without losing state
    expect(await sowImport.getUploadedFiles()).toContain('poles');
    expect(await sowImport.getCurrentStep()).toBe(1);
  });
});
```

### 6. Error Handling & Monitoring

#### Test 6.1: Sentry Integration
```typescript
describe('SOW Error Tracking', () => {
  it('should report parsing errors to Sentry', async () => {
    const corruptFile = createCorruptExcelFile();
    
    await sowImport.uploadFile('poles', corruptFile);
    
    // Verify Sentry capture
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Excel parsing failed')
      }),
      expect.objectContaining({
        tags: { module: 'sow', operation: 'parse' },
        extra: { fileName: 'poles.xlsx', fileSize: corruptFile.size }
      })
    );
  });
  
  it('should track import metrics', async () => {
    const startTime = Date.now();
    await sowImport.completeImport(validFiles);
    const duration = Date.now() - startTime;
    
    expect(analytics.track).toHaveBeenCalledWith('sow_import_completed', {
      projectId: expect.any(String),
      duration,
      fileCount: 3,
      totalRecords: 1300,
      errorCount: 0
    });
  });
});
```

### 7. Audit Trail Integration

#### Test 7.1: SOW Operations Audit
```typescript
describe('SOW Audit Trail', () => {
  it('should create audit entries for SOW operations', async () => {
    const projectId = 'test-project';
    const sowId = await sowService.create({ projectId, ...mockSOWData });
    
    // Check audit trail
    const audits = await auditService.getByEntity('sow', sowId);
    
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'create',
        entityType: 'sow',
        entityId: sowId,
        entityName: `SOW for ${projectId}`,
        userId: currentUser.uid,
        changes: expect.arrayContaining([
          {
            field: 'calculations',
            newValue: expect.any(Object)
          }
        ])
      })
    );
  });
});
```

### 8. Performance Integration Tests

#### Test 8.1: Large Dataset Handling
```typescript
describe('SOW Performance Tests', () => {
  it('should handle 10,000+ records efficiently', async () => {
    const largePoleData = generateLargeDataset(10000);
    const largeFile = createMockExcelFile('large.xlsx', largePoleData);
    
    const startTime = performance.now();
    await sowImport.uploadFile('poles', largeFile);
    await sowImport.process();
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(10000); // < 10 seconds
    expect(await sowImport.getProcessedCount()).toBe(10000);
  });
  
  it('should not block UI during processing', async () => {
    const largeFile = createLargeExcelFile();
    
    sowImport.uploadFile('poles', largeFile); // Don't await
    
    // UI should remain responsive
    const button = await page.$('.test-button');
    await button.click();
    expect(await page.$('.clicked')).toBeTruthy();
    
    // Wait for processing to complete
    await sowImport.waitForCompletion();
  });
});
```

### 9. End-to-End Integration Scenarios

#### Test 9.1: Complete Project Workflow with SOW
```typescript
describe('E2E: Project Creation to Progress Tracking', () => {
  it('should complete full workflow', async () => {
    // 1. Create project with SOW
    await navigateTo('/projects/new');
    await projectForm.fillDetails(testProjectData);
    await projectForm.goToSOWStep();
    
    // 2. Import SOW data
    await sowImport.uploadAllFiles(testSOWFiles);
    await sowImport.validateAndContinue();
    await sowImport.reviewCalculations();
    const projectId = await projectForm.saveProject();
    
    // 3. Verify project created with SOW
    const project = await projectService.get(projectId);
    expect(project.metadata.sowId).toBeDefined();
    expect(project.metadata.kpiTargets).toBeDefined();
    
    // 4. Add daily progress
    await navigateTo(`/daily-progress/new?projectId=${projectId}`);
    await dailyProgressForm.enter({
      polePermissions: 10,
      homeSignups: 6,
      fibreStringing: 500
    });
    await dailyProgressForm.save();
    
    // 5. Check progress tracking
    await navigateTo(`/projects/${projectId}`);
    const progressWidget = await projectDetail.getProgressWidget();
    
    expect(progressWidget.polePermissions).toEqual({
      daily: { achieved: 10, target: 10, percentage: 100 },
      total: { achieved: 10, target: 500, percentage: 2 }
    });
    
    // 6. Verify in analytics
    await navigateTo('/analytics/project-progress');
    await analytics.selectProject(projectId);
    
    const chart = await analytics.getProgressChart();
    expect(chart.data).toContainEqual({
      date: today(),
      actual: 10,
      target: 10,
      cumulative: 10
    });
  });
});
```

## Integration Test Configuration

### Test Environment Setup
```typescript
// test-setup.ts
export const setupIntegrationTests = () => {
  // Mock Firebase
  initializeTestEnvironment({
    projectId: 'test-fibreflow',
    auth: { uid: 'test-user', email: 'test@example.com' },
    firestore: { host: 'localhost', port: 8080 },
    storage: { host: 'localhost', port: 9199 }
  });
  
  // Mock Neon connection
  mockNeonDb({
    connectionString: process.env.TEST_NEON_URL
  });
  
  // Disable Sentry in tests
  Sentry.init({ enabled: false });
  
  // Speed up animations
  browser.setAnimationSpeed(0);
};
```

### Test Data Factories
```typescript
// test-data.factory.ts
export const createMockSOWData = (overrides = {}) => ({
  projectId: 'test-project',
  calculations: {
    totals: {
      polePermissionsTotal: 500,
      homeSignupsTotal: 300,
      fibreStringingTotal: 25000,
      totalDrops: 800,
      spareDrops: 200
    },
    dailyTargets: {
      polePermissionsDaily: 10,
      homeSignupsDaily: 6,
      fibreStringingDaily: 500,
      estimatedDays: 50
    }
  },
  ...overrides
});
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: SOW Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      firestore:
        image: gcr.io/google.com/cloudsdktool/cloud-sdk
        ports: [8080:8080]
      
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        ports: [5432:5432]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration:sow
        env:
          TEST_NEON_URL: postgresql://test@localhost:5432/test
```

## Test Metrics & Coverage

### Coverage Requirements
- Unit tests: 90% coverage
- Integration tests: 80% coverage
- E2E tests: Critical paths only

### Performance Benchmarks
- Import 1000 records: < 5 seconds
- Validate 5000 records: < 10 seconds
- Generate calculations: < 1 second
- Sync to Neon: < 3 seconds

### Error Rate Targets
- Import success rate: > 95%
- Validation accuracy: > 99%
- Sync reliability: > 99.9%