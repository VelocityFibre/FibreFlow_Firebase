import { Injectable } from '@angular/core';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx';
import { saveAs } from 'file-saver';
import { 
  WeeklyReportData, 
  ExecutiveSummary,
  PerformanceMetrics,
  RiskAssessment,
  Recommendation,
  Achievement,
  OperationalChallenge
} from '../models/weekly-report.model';

@Injectable({
  providedIn: 'root'
})
export class WeeklyReportDocxService {

  async generateReport(reportData: WeeklyReportData): Promise<void> {
    console.log('WeeklyReportDocxService.generateReport called with:', reportData);
    
    // Calculate week range string
    const weekRange = `${reportData.reportPeriod.startDate.toLocaleDateString()} - ${reportData.reportPeriod.endDate.toLocaleDateString()}`;
    console.log('Week range:', weekRange);
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Velocity Fibre',
                    bold: true,
                    size: 24,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                  new TextRun({
                    text: ' of ',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          ...this.createTitleSection(reportData, weekRange),
          ...this.createExecutiveSummary(reportData.executiveSummary),
          ...this.createPerformanceMetrics(reportData.performanceMetrics),
          ...this.createOperationalChallenges(reportData.operationalChallenges),
          ...this.createRiskAssessment(reportData.riskAssessment),
          ...this.createRecommendations(reportData.recommendations),
        ],
      }],
    });

    console.log('Creating DOCX blob...');
    const blob = await Packer.toBlob(doc);
    console.log('Blob created:', blob);
    console.log('Blob size:', blob.size, 'bytes');
    
    const filename = `${reportData.projectInfo.projectName}_Weekly_Report_${weekRange.replace(/\//g, '-')}.docx`;
    console.log('Saving file as:', filename);
    
    // Try alternative download method
    try {
      // Method 1: Using saveAs (file-saver)
      saveAs(blob, filename);
      console.log('saveAs called - file should be downloading');
    } catch (saveError) {
      console.error('saveAs failed:', saveError);
      
      // Method 2: Manual download link
      console.log('Trying alternative download method...');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log('Alternative download method completed');
    }
  }

  private createTitleSection(reportData: WeeklyReportData, weekRange: string): Paragraph[] {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `${reportData.projectInfo.projectName} Weekly Report`,
            bold: true,
            size: 48,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: weekRange,
            size: 28,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Customer: ${reportData.projectInfo.customer}`,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Location: ${reportData.projectInfo.location}`,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Prepared: ${new Date().toLocaleDateString()}`,
            size: 20,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
    ];
  }

  private createExecutiveSummary(summary: ExecutiveSummary): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Executive Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: summary.overview,
        spacing: { after: 200 },
      }),
    ];

    if (summary.keyAchievements.length > 0) {
      elements.push(
        new Paragraph({
          text: 'Key Achievements',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      summary.keyAchievements.forEach(achievement => {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${achievement.metric}: `,
                bold: true,
              }),
              new TextRun({
                text: `${achievement.value} - ${achievement.context}`,
              }),
            ],
            spacing: { after: 50 },
          })
        );
      });
    }

    if (summary.criticalFocusAreas.length > 0) {
      elements.push(
        new Paragraph({
          text: 'Critical Focus Areas',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      summary.criticalFocusAreas.forEach(area => {
        elements.push(
          new Paragraph({
            text: `• ${area}`,
            spacing: { after: 50 },
          })
        );
      });
    }

    return elements;
  }

  private createPerformanceMetrics(metrics: PerformanceMetrics): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Performance Metrics',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    ];

    // Infrastructure Development
    elements.push(
      new Paragraph({
        text: 'Infrastructure Development',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: `Total Poles Planted: ${metrics.infrastructureDevelopment.totalPolesPlanted}`,
        spacing: { after: 50 },
      }),
      new Paragraph({
        text: `Average Per Day: ${metrics.infrastructureDevelopment.averagePerDay.toFixed(1)}`,
        spacing: { after: 100 },
      })
    );

    // Permissions Processing
    if (metrics.permissionsProcessing) {
      elements.push(
        new Paragraph({
          text: 'Permissions Processing',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: `Total Permissions Secured: ${metrics.permissionsProcessing.totalPermissionsSecured}`,
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Best Performing Days: ${metrics.permissionsProcessing.bestPerformingDays.length}`,
          spacing: { after: 100 },
        })
      );
    }

    // Customer Engagement
    if (metrics.customerEngagement) {
      elements.push(
        new Paragraph({
          text: 'Customer Engagement',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: `Home Sign-ups: ${metrics.customerEngagement.homeSignUps}`,
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Home Drops: ${metrics.customerEngagement.homeDropsCompleted}`,
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Home Connections: ${metrics.customerEngagement.homeConnections}`,
          spacing: { after: 100 },
        })
      );
    }

    return elements;
  }

  private createOperationalChallenges(challenges: OperationalChallenge[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Operational Challenges',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    ];

    if (challenges.length === 0) {
      elements.push(
        new Paragraph({
          text: 'No significant operational challenges reported during this period.',
          spacing: { after: 200 },
        })
      );
    } else {
      challenges.forEach(challenge => {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${challenge.type}: `,
                bold: true,
              }),
              new TextRun({
                text: challenge.description,
              }),
            ],
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: `Impact: ${challenge.impact}`,
            indent: { left: 720 }, // 0.5 inch
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: `Days Affected: ${challenge.daysAffected}`,
            indent: { left: 720 },
            spacing: { after: 100 },
          })
        );
      });
    }

    return elements;
  }

  private createRiskAssessment(riskAssessment: RiskAssessment): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Risk Assessment',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `Overall Risk Level: ${riskAssessment.overallRiskLevel}`,
        spacing: { after: 100 },
      }),
    ];

    const allRisks = [...riskAssessment.immediateRisks, ...riskAssessment.mediumTermRisks];
    if (allRisks.length > 0) {
      elements.push(
        new Paragraph({
          text: 'Identified Risks',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );

      const risksTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Risk', bold: true })] 
                })] 
              }),
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Severity', bold: true })] 
                })] 
              }),
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Category', bold: true })] 
                })] 
              }),
              new TableCell({ 
                children: [new Paragraph({ 
                  children: [new TextRun({ text: 'Mitigation', bold: true })] 
                })] 
              }),
            ],
          }),
          ...allRisks.map(risk => 
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ text: risk.description })] 
                }),
                new TableCell({ 
                  children: [new Paragraph({ text: risk.severity })] 
                }),
                new TableCell({ 
                  children: [new Paragraph({ text: risk.category })] 
                }),
                new TableCell({ 
                  children: [new Paragraph({ text: risk.mitigation || 'TBD' })] 
                }),
              ],
            })
          ),
        ],
      });

      elements.push(risksTable);
    }

    return elements;
  }

  private createRecommendations(recommendations: Recommendation[]): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'Recommendations',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    ];

    recommendations.forEach((rec, index) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${rec.title}`,
              bold: true,
            }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Priority: ${rec.priority}`,
          indent: { left: 720 },
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Expected Impact: ${rec.expectedImpact}`,
          indent: { left: 720 },
          spacing: { after: 100 },
        })
      );
    });

    return elements;
  }
}