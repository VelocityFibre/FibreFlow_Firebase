#!/bin/bash

# Fix SCSS import issues before building

echo "Fixing SCSS import issues..."

# Fix Nokia Grid component SCSS - use correct import path
sed -i "s|@use '../../../../../styles/component-theming' as theme;|@use '../../../../styles/component-theming' as theme;|g" src/app/features/nokia/pages/nokia-grid/nokia-grid.component.scss

# Fix Photo Viewer Dialog SCSS - use correct import path  
sed -i "s|@use '../../../../../styles/component-theming' as theme;|@use '../../../../styles/component-theming' as theme;|g" src/app/features/pole-tracker/desktop/photo-viewer-dialog/photo-viewer-dialog.component.scss

echo "Building application..."
npm run build

echo "Build complete!"