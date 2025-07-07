import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
  CollectionReference,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { QualityMetrics, QualitySummary, QualityCheckpoint } from '../models/quality-metrics.model';

@Injectable({
  providedIn: 'root',
})
export class QualityService {
  private firestore = inject(Firestore);
  private qualityCollection = collection(
    this.firestore,
    'quality-metrics',
  ) as CollectionReference<QualityMetrics>;
  private checkpointsCollection = collection(
    this.firestore,
    'quality-checkpoints',
  ) as CollectionReference<QualityCheckpoint>;

  /**
   * Save quality metrics
   */
  saveQualityMetrics(metrics: QualityMetrics): Observable<void> {
    const docRef = metrics.id
      ? doc(this.qualityCollection, metrics.id)
      : doc(this.qualityCollection);

    const data = {
      ...metrics,
      id: docRef.id,
      updatedAt: Timestamp.now(),
    };

    return from(setDoc(docRef, data));
  }

  /**
   * Get quality metrics for a specific date
   */
  getQualityByDate(projectId: string, date: Date): Observable<QualityMetrics | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      this.qualityCollection,
      where('projectId', '==', projectId),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
      }),
    );
  }

  /**
   * Save quality checkpoint (inspection result)
   */
  saveCheckpoint(checkpoint: QualityCheckpoint): Observable<void> {
    const docRef = checkpoint.id
      ? doc(this.checkpointsCollection, checkpoint.id)
      : doc(this.checkpointsCollection);

    const data = {
      ...checkpoint,
      id: docRef.id,
      timestamp: Timestamp.now(),
    };

    return from(setDoc(docRef, data));
  }

  /**
   * Get quality summary for a period
   */
  getQualitySummary(projectId: string, startDate: Date, endDate: Date): Observable<QualitySummary> {
    const q = query(
      this.qualityCollection,
      where('projectId', '==', projectId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const metrics = snapshot.docs.map((doc) => doc.data());

        if (metrics.length === 0) {
          // Return empty summary
          return this.getEmptySummary(projectId, startDate, endDate);
        }

        // Calculate overview metrics
        const totalInspections = metrics.reduce((sum, m) => sum + m.inspections.completed, 0);
        const passedInspections = metrics.reduce((sum, m) => sum + m.inspections.passed, 0);
        const totalDefects = metrics.reduce((sum, m) => sum + m.defects.reported, 0);
        const totalRework = metrics.reduce((sum, m) => sum + m.rework.items, 0);
        const avgSatisfaction =
          metrics.reduce((sum, m) => sum + (m.customerSatisfaction.satisfactionScore || 0), 0) /
          metrics.length;
        const avgSLA =
          metrics.reduce((sum, m) => sum + m.slaCompliance.overallScore, 0) / metrics.length;

        // Calculate trends
        const qualityScores = metrics.map((m) => m.kpis.firstTimeRightRate || 0);
        const defectRates = metrics.map((m) => m.defects.defectRate || 0);
        const satisfactionScores = metrics.map(
          (m) => m.customerSatisfaction.satisfactionScore || 0,
        );
        const reworkHours = metrics.map((m) => m.rework.hoursSpent || 0);

        // Identify top issues
        const allIssues: Map<string, number> = new Map();
        metrics.forEach((m) => {
          // Count issue categories
          if (m.issues.critical > 0)
            allIssues.set(
              'Critical Issues',
              (allIssues.get('Critical Issues') || 0) + m.issues.critical,
            );
          if (m.issues.major > 0)
            allIssues.set('Major Issues', (allIssues.get('Major Issues') || 0) + m.issues.major);
          if (m.defects.verified > 0)
            allIssues.set(
              'Verified Defects',
              (allIssues.get('Verified Defects') || 0) + m.defects.verified,
            );
        });

        const topIssues = Array.from(allIssues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([description, frequency]) => ({
            description,
            frequency,
            impact:
              frequency > 10
                ? 'high'
                : frequency > 5
                  ? 'medium'
                  : ('low' as 'high' | 'medium' | 'low'),
            status: 'open' as 'open' | 'resolved',
          }));

        return {
          projectId,
          period: {
            start: startDate,
            end: endDate,
            type: this.getPeriodType(startDate, endDate),
          },
          overview: {
            totalInspections,
            passRate: totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0,
            defectRate: totalDefects / metrics.length,
            reworkRate: (totalRework / totalInspections) * 100,
            customerSatisfaction: avgSatisfaction,
            slaCompliance: avgSLA,
          },
          trends: {
            qualityScore: qualityScores,
            defectRate: defectRates,
            customerSatisfaction: satisfactionScores,
            reworkHours: reworkHours,
          },
          topIssues,
          recommendations: this.generateRecommendations(metrics),
        };
      }),
    );
  }

  private getEmptySummary(projectId: string, startDate: Date, endDate: Date): QualitySummary {
    return {
      projectId,
      period: {
        start: startDate,
        end: endDate,
        type: this.getPeriodType(startDate, endDate),
      },
      overview: {
        totalInspections: 0,
        passRate: 0,
        defectRate: 0,
        reworkRate: 0,
        customerSatisfaction: 0,
        slaCompliance: 100,
      },
      trends: {
        qualityScore: [],
        defectRate: [],
        customerSatisfaction: [],
        reworkHours: [],
      },
      topIssues: [],
      recommendations: [],
    };
  }

  private getPeriodType(start: Date, end: Date): 'daily' | 'weekly' | 'monthly' {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 1) return 'daily';
    if (diffDays <= 7) return 'weekly';
    return 'monthly';
  }

  private generateRecommendations(metrics: QualityMetrics[]): string[] {
    const recommendations: string[] = [];

    // Calculate averages
    const avgDefectRate =
      metrics.reduce((sum, m) => sum + (m.defects.defectRate || 0), 0) / metrics.length;
    const avgReworkRate =
      metrics.reduce((sum, m) => sum + m.rework.items, 0) /
      metrics.reduce((sum, m) => sum + m.inspections.completed, 0);
    const avgCompliance =
      metrics.reduce((sum, m) => sum + m.slaCompliance.overallScore, 0) / metrics.length;

    // Generate recommendations based on metrics
    if (avgDefectRate > 5) {
      recommendations.push(
        'High defect rate detected. Consider additional training for installation teams.',
      );
    }

    if (avgReworkRate > 0.1) {
      recommendations.push(
        'Significant rework required. Review installation procedures and quality checkpoints.',
      );
    }

    if (avgCompliance < 90) {
      recommendations.push(
        'SLA compliance below target. Review response and resolution processes.',
      );
    }

    // Check for safety issues
    const safetyIncidents = metrics.reduce(
      (sum, m) => sum + (m.safetyQuality?.incidentsReported || 0),
      0,
    );
    if (safetyIncidents > 0) {
      recommendations.push(
        'Safety incidents reported. Conduct safety review and additional toolbox talks.',
      );
    }

    return recommendations;
  }
}
