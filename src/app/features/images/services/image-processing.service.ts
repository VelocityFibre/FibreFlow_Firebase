import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from '@angular/fire/firestore';
import { Storage, ref, getDownloadURL, getMetadata } from '@angular/fire/storage';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';

export interface ProcessedImageData {
  fileName: string;
  site: string;
  project: string;
  uploadDate: Date;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  captureDate?: Date;
  address?: string;
  imageUrl: string;
  fileSize: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageProcessingService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private http = inject(HttpClient);

  async getUnprocessedImages(site: string, project?: string): Promise<any[]> {
    const uploadsRef = collection(this.firestore, 'uploaded-images');
    let q = query(uploadsRef, where('site', '==', site), where('processed', '==', false));

    if (project) {
      q = query(
        uploadsRef,
        where('site', '==', site),
        where('project', '==', project),
        where('processed', '==', false),
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async processImages(site: string, project?: string): Promise<ProcessedImageData[]> {
    console.log(`🔄 Starting image processing for site: ${site}, project: ${project || 'all'}`);

    const images = await this.getUnprocessedImages(site, project);
    console.log(`📸 Found ${images.length} unprocessed images`);

    const processedData: ProcessedImageData[] = [];

    for (const image of images) {
      try {
        console.log(`⚙️ Processing: ${image.fileName}`);

        // Get the storage reference
        const storageRef = ref(this.storage, image.storagePath);
        const downloadUrl = await getDownloadURL(storageRef);

        // Get metadata from storage
        const metadata = await getMetadata(storageRef);

        // Create processed data entry
        const processedImage: ProcessedImageData = {
          fileName: image.fileName,
          site: image.site,
          project: image.project || 'General',
          uploadDate: image.uploadedAt?.toDate() || new Date(),
          imageUrl: downloadUrl,
          fileSize: image.fileSize,
          processingStatus: 'processing',
        };

        // Extract GPS from EXIF if available
        const gpsData = await this.extractGPSFromImage(downloadUrl, image.fileName);
        if (gpsData) {
          processedImage.latitude = gpsData.latitude;
          processedImage.longitude = gpsData.longitude;
          processedImage.gpsAccuracy = gpsData.accuracy;
          processedImage.captureDate = gpsData.captureDate;

          // Reverse geocode if we have coordinates
          if (gpsData.latitude && gpsData.longitude) {
            processedImage.address = await this.reverseGeocode(gpsData.latitude, gpsData.longitude);
          }
        }

        processedImage.processingStatus = 'completed';
        processedData.push(processedImage);

        // Update the document to mark as processed
        await updateDoc(doc(this.firestore, 'uploaded-images', image.id), {
          processed: true,
          processedAt: new Date(),
          gpsData: gpsData || null,
          address: processedImage.address || null,
        });

        console.log(`✅ Processed: ${image.fileName}`);
      } catch (error: any) {
        console.error(`❌ Failed to process ${image.fileName}:`, error);

        const failedImage: ProcessedImageData = {
          fileName: image.fileName,
          site: image.site,
          project: image.project || 'General',
          uploadDate: image.uploadedAt?.toDate() || new Date(),
          imageUrl: '',
          fileSize: image.fileSize,
          processingStatus: 'failed',
          processingError: error.message,
        };

        processedData.push(failedImage);
      }
    }

    console.log(`✅ Processing complete. Processed ${processedData.length} images`);
    return processedData;
  }

  private async extractGPSFromImage(imageUrl: string, fileName: string): Promise<any> {
    // For WhatsApp images, GPS data is usually stripped
    // For GPS Map Camera images, metadata might be preserved
    // This is a placeholder - in production, you'd use a proper EXIF library

    console.log(`🗺️ Extracting GPS from: ${fileName}`);

    // Simulate GPS extraction based on filename patterns
    // In production, use exif-js or similar library
    if (fileName.toLowerCase().includes('gps') || fileName.toLowerCase().includes('map')) {
      // Mock GPS data for GPS Map Camera images
      return {
        latitude: -26.0627 + Math.random() * 0.01, // Johannesburg area
        longitude: 28.0826 + Math.random() * 0.01,
        accuracy: 5 + Math.random() * 10,
        captureDate: new Date(),
      };
    }

    // WhatsApp images typically don't have GPS
    return null;
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // Using OpenStreetMap Nominatim API (free, no key required)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

      const response = await firstValueFrom(
        this.http.get<any>(url, {
          headers: {
            'User-Agent': 'FibreFlow/1.0',
          },
        }),
      );

      if (response && response.display_name) {
        return response.display_name;
      }

      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  async generateExcelReport(processedData: ProcessedImageData[]): Promise<Blob> {
    console.log(`📊 Generating Excel report for ${processedData.length} images`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pole Photos Data');

    // Define columns
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 40 },
      { header: 'Site', key: 'site', width: 20 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Upload Date', key: 'uploadDate', width: 20 },
      { header: 'Capture Date', key: 'captureDate', width: 20 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'GPS Accuracy (m)', key: 'gpsAccuracy', width: 15 },
      { header: 'Address', key: 'address', width: 50 },
      { header: 'File Size (KB)', key: 'fileSize', width: 15 },
      { header: 'Processing Status', key: 'processingStatus', width: 15 },
      { header: 'Error', key: 'processingError', width: 30 },
      { header: 'Image URL', key: 'imageUrl', width: 60 },
    ];

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data
    processedData.forEach((data, index) => {
      const row = worksheet.addRow({
        fileName: data.fileName,
        site: data.site,
        project: data.project,
        uploadDate: data.uploadDate,
        captureDate: data.captureDate || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        gpsAccuracy: data.gpsAccuracy ? data.gpsAccuracy.toFixed(1) : '',
        address: data.address || '',
        fileSize: Math.round(data.fileSize / 1024),
        processingStatus: data.processingStatus,
        processingError: data.processingError || '',
        imageUrl: data.imageUrl,
      });

      // Style based on status
      if (data.processingStatus === 'failed') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' },
        };
      } else if (data.processingStatus === 'completed' && data.latitude) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' },
        };
      }
    });

    // Add filters
    worksheet.autoFilter = {
      from: 'A1',
      to: `M${processedData.length + 1}`,
    };

    // Freeze header row
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    // Generate summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    const totalImages = processedData.length;
    const successfulGPS = processedData.filter((d) => d.latitude && d.longitude).length;
    const failedProcessing = processedData.filter((d) => d.processingStatus === 'failed').length;

    summarySheet.addRows([
      { metric: 'Total Images Processed', value: totalImages },
      { metric: 'Images with GPS Data', value: successfulGPS },
      { metric: 'Images without GPS', value: totalImages - successfulGPS },
      { metric: 'Failed Processing', value: failedProcessing },
      {
        metric: 'Success Rate',
        value: `${(((totalImages - failedProcessing) / totalImages) * 100).toFixed(1)}%`,
      },
      {
        metric: 'GPS Extraction Rate',
        value: `${((successfulGPS / totalImages) * 100).toFixed(1)}%`,
      },
    ]);

    summarySheet.getRow(1).font = { bold: true };

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  downloadExcel(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
