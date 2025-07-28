#!/bin/bash

# Remove organization policy restrictions for vf-onemap-data
# Run this as the project owner to enable service account key creation

echo "🔓 Removing Organization Policy Restrictions"
echo "==========================================="
echo ""

PROJECT_ID="vf-onemap-data"

echo "📋 Step 1: Check current organization"
echo "Running: gcloud organizations list"
echo ""
gcloud organizations list 2>/dev/null || echo "No organization found (this is fine for personal projects)"

echo ""
echo "📋 Step 2: List current org policies"
echo "Running: gcloud resource-manager org-policies list --project=$PROJECT_ID"
echo ""
gcloud resource-manager org-policies list --project=$PROJECT_ID 2>/dev/null || echo "No policies found"

echo ""
echo "📋 Step 3: Remove the service account key creation restriction"
echo ""

# Try to remove the policy
echo "Attempting to remove policy..."
gcloud resource-manager org-policies delete \
  constraints/iam.disableServiceAccountKeyCreation \
  --project=$PROJECT_ID 2>/dev/null && echo "✅ Policy removed!" || echo "⚠️  Policy not found or already removed"

echo ""
echo "📋 Step 4: If the above didn't work, try disabling the constraint"
echo ""

# Create a policy file that disables the constraint
cat > /tmp/disable-key-policy.yaml << EOF
constraint: constraints/iam.disableServiceAccountKeyCreation
booleanPolicy:
  enforced: false
EOF

echo "Attempting to disable constraint..."
gcloud resource-manager org-policies set-policy /tmp/disable-key-policy.yaml \
  --project=$PROJECT_ID 2>/dev/null && echo "✅ Constraint disabled!" || echo "⚠️  Could not set policy"

# Clean up
rm -f /tmp/disable-key-policy.yaml

echo ""
echo "📋 Alternative: Use Google Cloud Console"
echo ""
echo "If the commands above didn't work, try this:"
echo ""
echo "1. Go to: https://console.cloud.google.com/iam-admin/orgpolicies/list?project=$PROJECT_ID"
echo "2. Look for 'Disable service account key creation'"
echo "3. Click on it"
echo "4. Click 'MANAGE POLICY'"
echo "5. Select 'Customize'"
echo "6. Under 'Policy values', select 'Allow all'"
echo "7. Click 'SAVE'"
echo ""
echo "OR if you see it's inherited from organization:"
echo ""
echo "1. Go to: https://console.cloud.google.com/iam-admin/orgpolicies"
echo "2. Select your organization from the dropdown"
echo "3. Find 'Disable service account key creation'"
echo "4. Edit it to allow key creation for vf-onemap-data project"
echo ""
echo "📋 After fixing the policy, you can:"
echo ""
echo "1. Go back to: https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
echo "2. Click 'Generate new private key' (it should work now!)"
echo "3. Save as: /home/ldp/VF/Apps/FibreFlow/OneMap/credentials/vf-onemap-service-account.json"
echo ""
echo "✅ Then run: node scripts/simple-import-solution.js 'your-csv-file.csv'"