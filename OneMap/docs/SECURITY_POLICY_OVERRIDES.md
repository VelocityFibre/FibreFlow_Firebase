# Security Policy Overrides for vf-onemap-data

**Date**: 2025-01-28  
**Project**: vf-onemap-data  
**Purpose**: Enable Firebase Admin SDK authentication for automated CSV imports

## Organization Policies Modified

### 1. Service Account Key Creation Policies
- **Policy**: `iam.managed.disableServiceAccountKeyCreation`
- **Changed from**: Inherit parent's policy (enforced)
- **Changed to**: Override parent's policy → Not enforced
- **Scope**: vf-onemap-data project only

- **Policy**: `iam.disableServiceAccountKeyCreation` (legacy)
- **Changed from**: Inherit parent's policy (enforced)  
- **Changed to**: Override parent's policy → Not enforced
- **Scope**: vf-onemap-data project only

### 2. Service Account Generated
- **Account**: `firebase-adminsdk-fbsvc@vf-onemap-data.iam.gserviceaccount.com`
- **Key File**: `vf-onemap-data-firebase-adminsdk-fbsvc-e036201984.json`
- **Location**: `/home/ldp/VF/Apps/FibreFlow/OneMap/credentials/vf-onemap-service-account.json`
- **Permissions**: 600 (read/write owner only)

## Why These Overrides Were Needed

1. **Organization Default**: velocityfibreapp.com enforces no service account key creation
2. **Business Need**: Automated CSV imports from OneMap require Firebase Admin SDK
3. **Firebase Admin SDK**: Requires service account key for authentication
4. **Automation**: Scripts need to run without user interaction

## Security Considerations

- ✅ Changes limited to vf-onemap-data project only
- ✅ Other projects maintain strict security policies
- ✅ Using default Firebase service account (not custom)
- ✅ Key stored with restricted file permissions
- ✅ No cross-project access granted

## Audit Trail

- **Who**: louis@velocityfibreapp.com (Project Owner)
- **When**: 2025-01-28
- **What**: Overrode organization policies to allow service account key creation
- **Why**: Enable automated OneMap CSV imports to vf-onemap-data

## Related Documentation

- [Firebase Auth Integration Plan](./FIREBASE_AUTH_INTEGRATION_PLAN.md)
- [OneMap Import System](../ONEMAP_IMPORT_TRACKING_SYSTEM.md)
- [Google Cloud Organization Policies](https://cloud.google.com/resource-manager/docs/organization-policy/overview)

## For AI Agents

When working with vf-onemap-data:
- Service account key is available at: `credentials/vf-onemap-service-account.json`
- Use this for Firebase Admin SDK initialization
- No additional authentication setup needed
- Scripts can run automated imports using this key

## Reverting Changes (If Needed)

To re-enable security policies:
1. Go to: https://console.cloud.google.com/iam-admin/orgpolicies/list?project=vf-onemap-data
2. Find both policies mentioned above
3. Change back to "Inherit parent's policy"
4. Delete the service account key file

---

*This document serves as the official record of security policy modifications for vf-onemap-data.*