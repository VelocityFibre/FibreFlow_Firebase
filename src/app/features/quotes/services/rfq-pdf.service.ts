import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RFQ } from '../models/rfq.model';
import { BOQItem } from '../../boq/models/boq.model';
import { Supplier } from '../../../core/suppliers/models/supplier.model';

@Injectable({
  providedIn: 'root',
})
export class RFQPDFService {
  generateRFQPDF(rfq: RFQ, items: BOQItem[], suppliers: Supplier[]): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUEST FOR QUOTATION', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // RFQ Number
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(rfq.rfqNumber, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Company Info Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('FibreFlow Construction Management', 20, yPosition);
    yPosition += 5;
    doc.text('Email: procurement@fibreflow.com', 20, yPosition);
    yPosition += 5;
    doc.text('Phone: +27 11 123 4567', 20, yPosition);
    yPosition += 15;

    // RFQ Details Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RFQ Details:', 20, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Create a details table
    const details = [
      ['Project:', rfq.projectName],
      ['Title:', rfq.title],
      ['Issue Date:', new Date(rfq.createdAt).toLocaleDateString()],
      ['Deadline:', new Date(rfq.deadline).toLocaleDateString()],
      ['Delivery Location:', rfq.deliveryLocation || 'To be specified'],
      ['Payment Terms:', this.formatPaymentTerms(rfq.paymentTerms || '')],
    ];

    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPosition);
      yPosition += 5;
    });
    yPosition += 10;

    // Description
    if (rfq.description) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitDescription = doc.splitTextToSize(rfq.description, pageWidth - 40);
      doc.text(splitDescription, 20, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    // Special Requirements
    if (rfq.specialRequirements) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Special Requirements:', 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitRequirements = doc.splitTextToSize(rfq.specialRequirements, pageWidth - 40);
      doc.text(splitRequirements, 20, yPosition);
      yPosition += splitRequirements.length * 5 + 10;
    }

    // Check if we need a new page for the items table
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    // Items Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Items Required:', 20, yPosition);
    yPosition += 10;

    // Prepare items data for table
    const itemsData = items.map((item, index) => [
      (index + 1).toString(),
      item.itemCode || '-',
      item.description + (item.specification ? '\n' + item.specification : ''),
      item.remainingQuantity.toString(),
      item.unit,
      item.unitPrice > 0 ? `R ${item.unitPrice.toFixed(2)}` : '-',
      item.unitPrice > 0 ? `R ${(item.unitPrice * item.remainingQuantity).toFixed(2)}` : '-',
    ]);

    // Add total row
    const totalValue = items.reduce(
      (sum, item) => sum + item.unitPrice * item.remainingQuantity,
      0,
    );
    itemsData.push(['', '', 'TOTAL ESTIMATED VALUE', '', '', '', `R ${totalValue.toFixed(2)}`]);

    // Create items table
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Item Code', 'Description', 'Qty', 'Unit', 'Est. Unit Price', 'Est. Total']],
      body: itemsData,
      theme: 'striped',
      headStyles: {
        fillColor: [33, 150, 243],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 15 },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNumber = data.pageNumber;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      },
    });

    // Get the final Y position after the table
    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Check if we need a new page for suppliers
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Suppliers Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('This RFQ is sent to:', 20, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    suppliers.forEach((supplier) => {
      doc.text(`• ${supplier.companyName} (${supplier.primaryEmail})`, 25, yPosition);
      yPosition += 5;
    });
    yPosition += 10;

    // Instructions
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions to Suppliers:', 20, yPosition);
    yPosition += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const instructions = [
      '1. Please submit your quotation before the deadline mentioned above.',
      '2. Include all applicable taxes and delivery charges in your quote.',
      '3. Specify the validity period of your quotation.',
      '4. Provide detailed specifications for each item.',
      '5. Include estimated delivery times for each item.',
      '6. Send your quotation to: procurement@fibreflow.com',
    ];

    instructions.forEach((instruction) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      const splitText = doc.splitTextToSize(instruction, pageWidth - 40);
      doc.text(splitText, 20, yPosition);
      yPosition += splitText.length * 5 + 3;
    });

    // Return the PDF document
    return doc;
  }

  private formatPaymentTerms(terms: string): string {
    const termsMap: Record<string, string> = {
      '30_days': '30 Days',
      '60_days': '60 Days',
      '90_days': '90 Days',
      cod: 'Cash on Delivery',
      advance: '50% Advance, 50% on Delivery',
      custom: 'Custom Terms',
    };
    return termsMap[terms] || terms;
  }

  // Save PDF to file
  savePDF(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }

  // Get PDF as base64 string for email attachments
  getPDFAsBase64(doc: jsPDF): string {
    return doc.output('datauristring').split(',')[1];
  }

  // Get PDF as blob for other uses
  getPDFAsBlob(doc: jsPDF): Blob {
    return doc.output('blob');
  }
}
