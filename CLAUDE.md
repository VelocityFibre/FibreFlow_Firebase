# Claude Development Notes

## Secret Management Guidelines

### Where We Store Secrets

1. **Local Development Secrets** (Never committed to Git)
   - **Location**: `.env.local`
   - **Purpose**: Local development credentials, API keys, passwords
   - **Example**: Fireflies API key, Firebase CI tokens
   - **Note**: This file is gitignored and only exists on your local machine

2. **Firebase Functions Config** (For deployed functions)
   - **Set via CLI**: `firebase functions:config:set service.key="value"`
   - **Example**: `firebase functions:config:set fireflies.api_key="[VALUE FROM .env.local]"`
   - **Retrieve**: `firebase functions:config:get`
   - **Note**: These are stored securely in Firebase and not in code

3. **Firebase Environment Variables** (For Angular app)
   - **Location**: `src/environments/environment.ts` (public keys only!)
   - **Never store**: Passwords, secret keys, or sensitive data here
   - **Only store**: Public Firebase config, API endpoints

### Important Security Rules

1. **NEVER commit** `.env.local` or any `.env` files to Git
2. **NEVER store** sensitive credentials in the Angular app code
3. **ALWAYS use** Firebase Functions for operations requiring secret keys
4. **ALWAYS check** `.gitignore` includes all env files

### Current Secrets Storage

```
.env.local (Local development only - not in Git)
├── FIREBASE_TOKEN (for CI/CD)
├── FIREFLIES_EMAIL (for dev reference)
├── FIREFLIES_PASSWORD (for dev reference)
└── FIREFLIES_API_KEY (stored locally, deploy to Firebase Functions)

Firebase Functions Config (for production)
└── fireflies.api_key (deploy from .env.local value)
```

### How to Add New Secrets

1. **For local development**:
   ```bash
   echo "NEW_SECRET=value" >> .env.local
   ```

2. **For Firebase Functions**:
   ```bash
   # Read value from .env.local and set in Firebase
   firebase functions:config:set service.key="value"
   firebase deploy --only functions
   ```

3. **For production Angular** (public keys only):
   - Edit `src/environments/environment.prod.ts`
   - Only add non-sensitive configuration

### Security Checklist
- [ ] Is `.env.local` in `.gitignore`? ✓
- [ ] Are all sensitive operations in Firebase Functions? ✓
- [ ] Are API keys stored in Firebase config, not code? ✓
- [ ] Have you verified no secrets in commit history? ✓

---

## Project-Specific Notes

### Fireflies Integration
- All credentials stored in `.env.local` (never pushed to GitHub)
- API key must be deployed to Firebase Functions config for production
- Deploy command: Check `.env.local` for the exact command with API key
- All API calls happen through Firebase Functions, never from Angular

### Firebase Setup
- Firebase CI token in `.env.local` for automated deployments
- Project credentials in `firebase.json` and `.firebaserc` (safe to commit)

### Deployment Commands
```bash
# To deploy Fireflies API key (get value from .env.local)
firebase functions:config:set fireflies.api_key="[CHECK .env.local]"

# To verify configuration
firebase functions:config:get

# To deploy functions
firebase deploy --only functions
```

---

*Last updated: 2025-06-25*