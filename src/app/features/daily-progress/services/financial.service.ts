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
  Timestamp 
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { ProjectFinancials, FinancialSummary } from '../models/financial-tracking.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private firestore = inject(Firestore);
  private financialsCollection = collection(this.firestore, 'project-financials') as CollectionReference<ProjectFinancials>;

  /**
   * Create or update financial entry
   */
  saveFinancials(financials: ProjectFinancials): Observable<void> {
    const docRef = financials.id 
      ? doc(this.financialsCollection, financials.id)
      : doc(this.financialsCollection);
    
    const data = {
      ...financials,
      id: docRef.id,
      updatedAt: Timestamp.now()
    };

    return from(setDoc(docRef, data));
  }

  /**
   * Get financials for a specific date
   */
  getFinancialsByDate(projectId: string, date: Date): Observable<ProjectFinancials | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      this.financialsCollection,
      where('projectId', '==', projectId),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
      })
    );
  }

  /**
   * Get financial summary for a date range
   */
  getFinancialSummary(projectId: string, startDate: Date, endDate: Date): Observable<FinancialSummary> {
    const q = query(
      this.financialsCollection,
      where('projectId', '==', projectId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        const financials = snapshot.docs.map(doc => doc.data());
        
        // Calculate totals
        const totalRevenue = financials.reduce((sum, f) => sum + (f.revenue?.total || 0), 0);
        const totalCosts = financials.reduce((sum, f) => sum + 
          (f.laborCost.total + f.materialCost.total + f.equipmentCost.total + f.otherCosts.total), 0);
        
        const costBreakdown = {
          labor: financials.reduce((sum, f) => sum + f.laborCost.total, 0),
          materials: financials.reduce((sum, f) => sum + f.materialCost.total, 0),
          equipment: financials.reduce((sum, f) => sum + f.equipmentCost.total, 0),
          other: financials.reduce((sum, f) => sum + f.otherCosts.total, 0)
        };

        const revenueBreakdown = {
          connections: financials.reduce((sum, f) => sum + (f.revenue?.homesConnected || 0), 0),
          activations: financials.reduce((sum, f) => sum + (f.revenue?.serviceActivations || 0), 0),
          installations: financials.reduce((sum, f) => sum + (f.revenue?.installations || 0), 0),
          other: financials.reduce((sum, f) => sum + (f.revenue?.other || 0), 0)
        };

        const grossProfit = totalRevenue - totalCosts;
        const netProfit = grossProfit; // Simplified - would include taxes, etc.
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
          projectId,
          period: {
            start: startDate,
            end: endDate,
            type: this.getPeriodType(startDate, endDate)
          },
          totalRevenue,
          totalCosts,
          grossProfit,
          netProfit,
          costBreakdown,
          revenueBreakdown,
          metrics: {
            avgCostPerDay: totalCosts / financials.length,
            avgRevenuePerDay: totalRevenue / financials.length,
            profitMargin,
            roi: 0, // Would need initial investment data
            paybackPeriod: 0 // Would need more complex calculation
          }
        };
      })
    );
  }

  private getPeriodType(start: Date, end: Date): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays <= 1) return 'daily';
    if (diffDays <= 7) return 'weekly';
    if (diffDays <= 31) return 'monthly';
    if (diffDays <= 93) return 'quarterly';
    return 'yearly';
  }
}