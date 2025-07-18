import { Injectable } from '@angular/core';
import { PoleRecord, ParsedPoleRecord } from '../../models/pole-record.model';
import { ProcessedPoleData, ProcessingMetadata } from '../../models/processed-pole-data.model';

/**
 * Validation result for a single rule
 */
interface ValidationResult {
  ruleName: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  details?: any;
}

/**
 * Overall validation report
 */
export interface ValidationReport {
  isValid: boolean;
  confidence: number; // 0-100%
  results: ValidationResult[];
  summary: string;
}

/**
 * Simple but powerful validation service
 * Uses multiple lightweight validation strategies
 */
@Injectable({
  providedIn: 'root',
})
export class PoleDataValidatorService {
  /**
   * Validates processed data using multiple strategies
   */
  validateProcessing(
    inputRecords: PoleRecord[],
    processedData: ProcessedPoleData,
  ): ValidationReport {
    const results: ValidationResult[] = [];

    // 1. Basic Integrity Checks
    results.push(this.validateRecordCount(inputRecords, processedData));
    results.push(this.validateNoDataLoss(inputRecords, processedData));
    results.push(this.validateUniqueConstraints(processedData));

    // 2. Business Rule Validation
    results.push(this.validateDuplicateRemoval(processedData));
    results.push(this.validateDateSequencing(processedData));
    results.push(this.validateAgentConsistency(processedData));

    // 3. Statistical Validation
    results.push(this.validateDistribution(processedData));
    results.push(this.validateOutliers(processedData));

    // 4. Checksum Validation
    results.push(this.validateChecksums(inputRecords, processedData));

    // Calculate overall validity and confidence
    const errors = results.filter((r) => r.severity === 'error' && !r.passed);
    const warnings = results.filter((r) => r.severity === 'warning' && !r.passed);

    const isValid = errors.length === 0;
    const confidence = this.calculateConfidence(results);

    return {
      isValid,
      confidence,
      results,
      summary: this.generateSummary(results, isValid, confidence),
    };
  }

  /**
   * Rule 1: Validate record counts add up
   */
  private validateRecordCount(input: PoleRecord[], output: ProcessedPoleData): ValidationResult {
    const inputWithStatus = input.filter((r) =>
      r['Flow Name Groups'].includes('Pole Permission: Approved'),
    ).length;

    const outputTotal =
      output.firstStatusChanges.length +
      output.duplicatePoles.length +
      output.noPoleAllocated.length;

    const passed = inputWithStatus === outputTotal;

    return {
      ruleName: 'Record Count Validation',
      passed,
      message: passed
        ? `All ${inputWithStatus} records accounted for`
        : `Mismatch: ${inputWithStatus} input vs ${outputTotal} output`,
      severity: 'error',
      details: { inputWithStatus, outputTotal },
    };
  }

  /**
   * Rule 2: Ensure no data loss
   */
  private validateNoDataLoss(input: PoleRecord[], output: ProcessedPoleData): ValidationResult {
    // Check all pole numbers are accounted for
    const inputPoleNumbers = new Set(
      input.filter((r) => r['Pole Number']).map((r) => r['Pole Number']),
    );

    const outputPoleNumbers = new Set([
      ...output.firstStatusChanges.map((r) => r['Pole Number']),
      ...output.duplicatePoles.map((r) => r['Pole Number']),
      ...output.noPoleAllocated.map((r) => r['Property ID']), // These have no pole number
    ]);

    const missingPoles = [...inputPoleNumbers].filter((p) => !outputPoleNumbers.has(p));
    const passed = missingPoles.length === 0;

    return {
      ruleName: 'Data Loss Check',
      passed,
      message: passed
        ? 'No data loss detected'
        : `${missingPoles.length} poles missing from output`,
      severity: 'error',
      details: { missingPoles: missingPoles.slice(0, 10) }, // First 10
    };
  }

  /**
   * Rule 3: Validate unique constraints
   */
  private validateUniqueConstraints(output: ProcessedPoleData): ValidationResult {
    const poleNumbers = output.firstStatusChanges.map((r) => r['Pole Number']);
    const uniquePoles = new Set(poleNumbers);
    const passed = poleNumbers.length === uniquePoles.size;

    return {
      ruleName: 'Unique Pole Constraint',
      passed,
      message: passed
        ? 'All poles in first status changes are unique'
        : `Found ${poleNumbers.length - uniquePoles.size} duplicate poles`,
      severity: 'error',
    };
  }

  /**
   * Rule 4: Validate duplicate removal logic
   */
  private validateDuplicateRemoval(output: ProcessedPoleData): ValidationResult {
    // For each pole in firstStatusChanges, verify it has the earliest date
    // compared to its duplicates
    let errors = 0;

    for (const pole of output.firstStatusChanges) {
      const duplicates = output.duplicatePoles.filter(
        (d) => d['Pole Number'] === pole['Pole Number'],
      );

      if (duplicates.length > 0) {
        const poleDate = new Date(pole['lst_mod_dt']);
        const hasEarlierDuplicate = duplicates.some((d) => new Date(d['lst_mod_dt']) < poleDate);

        if (hasEarlierDuplicate) {
          errors++;
        }
      }
    }

    const passed = errors === 0;

    return {
      ruleName: 'Duplicate Removal Logic',
      passed,
      message: passed
        ? 'All kept records have earliest dates'
        : `${errors} poles kept that aren't the earliest`,
      severity: 'error',
      details: { errors },
    };
  }

  /**
   * Rule 5: Validate date sequencing
   */
  private validateDateSequencing(output: ProcessedPoleData): ValidationResult {
    // Check monthly/weekly breakdowns are in order
    const monthlyDates = output.monthlyBreakdown.map((m) => `${m.year}-${m.month}`);
    const sortedMonthly = [...monthlyDates].sort();
    const monthlyOrdered = JSON.stringify(monthlyDates) === JSON.stringify(sortedMonthly);

    const weeklyDates = output.weeklyBreakdown.map((w) => w.weekEndingDate.getTime());
    const sortedWeekly = [...weeklyDates].sort((a, b) => a - b);
    const weeklyOrdered = JSON.stringify(weeklyDates) === JSON.stringify(sortedWeekly);

    const passed = monthlyOrdered && weeklyOrdered;

    return {
      ruleName: 'Date Sequencing',
      passed,
      message: passed ? 'All time periods are properly sequenced' : 'Time periods are out of order',
      severity: 'warning',
    };
  }

  /**
   * Rule 6: Validate agent consistency
   */
  private validateAgentConsistency(output: ProcessedPoleData): ValidationResult {
    const mismatches = output.agentDataMismatches.length;
    const total = output.firstStatusChanges.length;
    const errorRate = total > 0 ? (mismatches / total) * 100 : 0;

    // Warning if more than 5% mismatches
    const passed = errorRate <= 5;

    return {
      ruleName: 'Agent Data Consistency',
      passed,
      message: `${errorRate.toFixed(1)}% agent mismatches`,
      severity: passed ? 'info' : 'warning',
      details: { mismatches, total, errorRate },
    };
  }

  /**
   * Rule 7: Statistical distribution check
   */
  private validateDistribution(output: ProcessedPoleData): ValidationResult {
    // Check if monthly distribution seems reasonable
    const monthlyCounts = output.monthlyBreakdown.map((m) => m.count);
    const avg = monthlyCounts.reduce((a, b) => a + b, 0) / monthlyCounts.length;
    const stdDev = Math.sqrt(
      monthlyCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) /
        monthlyCounts.length,
    );

    // Flag if any month is more than 3 standard deviations from mean
    const outliers = monthlyCounts.filter((count) => Math.abs(count - avg) > 3 * stdDev);
    const passed = outliers.length === 0;

    return {
      ruleName: 'Distribution Analysis',
      passed,
      message: passed
        ? 'Monthly distribution appears normal'
        : `${outliers.length} months have unusual activity`,
      severity: 'warning',
      details: { avg: avg.toFixed(0), stdDev: stdDev.toFixed(0), outliers },
    };
  }

  /**
   * Rule 8: Check for suspicious outliers
   */
  private validateOutliers(output: ProcessedPoleData): ValidationResult {
    // Check for suspicious patterns (e.g., all records on same date)
    const dateCounts = new Map<string, number>();

    output.firstStatusChanges.forEach((record) => {
      const date = new Date(record['lst_mod_dt']).toDateString();
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    });

    const total = output.firstStatusChanges.length;
    const maxOnOneDay = Math.max(...dateCounts.values());
    const concentration = total > 0 ? (maxOnOneDay / total) * 100 : 0;

    // Warning if more than 25% on single day
    const passed = concentration <= 25;

    return {
      ruleName: 'Outlier Detection',
      passed,
      message: passed
        ? 'No suspicious data concentrations'
        : `${concentration.toFixed(1)}% of records on single day`,
      severity: 'warning',
      details: { maxOnOneDay, total, concentration },
    };
  }

  /**
   * Rule 9: Checksum validation
   */
  private validateChecksums(input: PoleRecord[], output: ProcessedPoleData): ValidationResult {
    // Simple checksum based on pole numbers
    const inputChecksum = this.calculateChecksum(
      input
        .map((r) => r['Pole Number'])
        .filter((p) => p)
        .sort(),
    );

    const outputChecksum = this.calculateChecksum(
      [
        ...output.firstStatusChanges.map((r) => r['Pole Number']),
        ...output.duplicatePoles.map((r) => r['Pole Number']),
      ].sort(),
    );

    const passed = inputChecksum === outputChecksum;

    return {
      ruleName: 'Checksum Validation',
      passed,
      message: passed ? 'Input/output checksums match' : 'Checksum mismatch detected',
      severity: 'error',
    };
  }

  /**
   * Calculate simple checksum for array of strings
   */
  private calculateChecksum(items: string[]): string {
    let hash = 0;
    const str = items.join('|');

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(results: ValidationResult[]): number {
    const weights = {
      error: 10,
      warning: 3,
      info: 1,
    };

    let totalWeight = 0;
    let passedWeight = 0;

    results.forEach((result) => {
      const weight = weights[result.severity];
      totalWeight += weight;
      if (result.passed) {
        passedWeight += weight;
      }
    });

    return Math.round((passedWeight / totalWeight) * 100);
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    results: ValidationResult[],
    isValid: boolean,
    confidence: number,
  ): string {
    const errors = results.filter((r) => r.severity === 'error' && !r.passed);
    const warnings = results.filter((r) => r.severity === 'warning' && !r.passed);

    if (isValid && confidence >= 95) {
      return 'Processing validated successfully with high confidence';
    } else if (isValid) {
      return `Processing validated with ${warnings.length} warnings (${confidence}% confidence)`;
    } else {
      return `Validation failed: ${errors.length} errors, ${warnings.length} warnings`;
    }
  }
}
