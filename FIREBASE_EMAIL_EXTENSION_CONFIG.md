# Firebase Email Extension Configuration

## SMTP Configuration for Gmail

Use these exact values when installing the Firebase Email Extension:

### SMTP Connection URI:
```
smtps://louis@velocityfibreapp.com:ebgcdgigrgtdbkpy@smtp.gmail.com:465
```

### Other Settings:
- **Email documents collection**: `mail`
- **Default FROM address**: `louis@velocityfibreapp.com`
- **Default REPLY-TO address**: `louis@velocityfibreapp.com`
- **Users collection**: `users` (optional)
- **Templates collection**: Leave empty

## Installation Steps:

1. Go to Firebase Console Extensions:
   https://console.firebase.google.com/project/fibreflow-73daf/extensions

2. Click "Install Extension"

3. Search for "Trigger Email from Firestore"

4. Click "Install"

5. During configuration, paste the SMTP URI above

6. Complete the installation

## Testing:
After installation, test by sending an RFQ to suppliers from the app.

## Security Note:
The app password is now stored securely in Firebase Secret Manager and is not visible in your code.