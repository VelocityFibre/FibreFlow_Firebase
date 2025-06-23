import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, onSnapshot } from '@angular/fire/firestore';
import { NotificationService } from '../../../core/services/notification.service';

@Injectable({
  providedIn: 'root',
})
export class TestEmailService {
  constructor(
    private firestore: Firestore,
    private notificationService: NotificationService,
  ) {}

  async sendTestEmail(): Promise<void> {
    try {
      // Create the email document
      const emailDoc = {
        to: ['louisrdup@gmail.com'],
        message: {
          subject: 'Test Email from FibreFlow - Firebase Email Extension',
          text: `This is a test email from your FibreFlow application.

The Firebase Email Extension is working correctly!

This email was sent on ${new Date().toLocaleString()}.

Best regards,
FibreFlow Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Test Email from FibreFlow</h2>
              <p>This is a test email from your FibreFlow application.</p>
              <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Status:</strong> ✅ The Firebase Email Extension is working correctly!</p>
              </div>
              <p>This email was sent on ${new Date().toLocaleString()}.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px;">Best regards,<br>FibreFlow Team</p>
            </div>
          `,
        },
      };

      // Add to Firestore
      const docRef = await addDoc(collection(this.firestore, 'mail'), emailDoc);
      console.log('Email document created with ID:', docRef.id);
      this.notificationService.success('Test email queued for delivery!');

      // Monitor delivery status
      const unsubscribe = onSnapshot(doc(this.firestore, 'mail', docRef.id), (snapshot) => {
        const data = snapshot.data();
        if (data?.['delivery']) {
          console.log('Email delivery status:', data['delivery']);
          if (data['delivery'].state === 'SUCCESS') {
            this.notificationService.success('Test email sent successfully!');
            unsubscribe();
          } else if (data['delivery'].state === 'ERROR') {
            this.notificationService.error('Failed to send test email: ' + data['delivery'].error);
            unsubscribe();
          }
        }
      });

      // Stop monitoring after 30 seconds
      setTimeout(() => {
        unsubscribe();
      }, 30000);
    } catch (error) {
      console.error('Error sending test email:', error);
      this.notificationService.error('Failed to send test email');
      throw error;
    }
  }
}
