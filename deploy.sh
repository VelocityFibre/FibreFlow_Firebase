#!/bin/bash
# Firebase deployment script with persistent authentication

# Load token from .env.local file
if [ -f .env.local ]; then
    export $(grep FIREBASE_TOKEN .env.local | xargs)
fi

# Check if token is set
if [ -z "$FIREBASE_TOKEN" ]; then
    echo "Error: FIREBASE_TOKEN not found in .env.local"
    exit 1
fi

# Function to deploy to preview channel
deploy_preview() {
    local channel_name=${1:-"preview"}
    local expires=${2:-"7d"}
    
    echo "Building project..."
    npm run build
    
    echo "Deploying to preview channel: $channel_name"
    firebase hosting:channel:deploy "$channel_name" --expires "$expires" --token "$FIREBASE_TOKEN"
}

# Function to deploy to production
deploy_prod() {
    echo "Building project..."
    npm run build
    
    echo "Deploying to production..."
    firebase deploy --only hosting --token "$FIREBASE_TOKEN"
}

# Main script
case "$1" in
    "preview")
        deploy_preview "$2" "$3"
        ;;
    "prod")
        deploy_prod
        ;;
    *)
        echo "Usage: ./deploy.sh [preview|prod] [channel-name] [expires]"
        echo "Examples:"
        echo "  ./deploy.sh preview feature-xyz 7d"
        echo "  ./deploy.sh prod"
        ;;
esac