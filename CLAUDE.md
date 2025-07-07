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

## Version Control Workflow (jj - Jujutsu)

### Why jj Instead of Git

As a solo developer, we use **jj (Jujutsu)** for version control because:
- **No staging area** - all changes are automatically tracked
- **Every change is a snapshot** - no need to manually commit
- **Deploy what you see** - no confusion about uncommitted changes
- **Simplified workflow** - focus on building, not git commands

### Daily Workflow

```bash
# Everything is automatically tracked! Just:
deploy  # This alias commits everything and deploys
```

### Common Commands

```bash
# Check status (replaces git status)
jj st

# See your changes (replaces git diff)
jj diff

# Update your current change description
jj describe -m "your message"

# Push to GitHub and deploy
deploy  # Custom alias that does everything

# See history
jj log
```

### Setup Commands (Already Done)

```bash
# Initialize jj with git coexistence
jj git init --colocate

# Import existing git history
jj git import
```

### Deployment Workflow

Our `deploy` command does everything:
1. Automatically captures all current changes
2. Creates a commit with timestamp
3. Pushes to GitHub
4. Deploys to Firebase

```bash
# One command to rule them all:
deploy

# Or if you want a custom message:
deploy "Added new feature X"
```

### Important Notes

- **No need to "add" files** - jj tracks everything automatically
- **No need to commit** - every save is already tracked
- **No branches needed** - work directly on main
- **Conflicts are rare** - as a solo dev, you control everything

### Troubleshooting

```bash
# If you need to see what jj is tracking
jj st

# If you need to undo the last change
jj undo

# If you need to go back to a previous version
jj restore
```

---

*Last updated: 2025-07-07*