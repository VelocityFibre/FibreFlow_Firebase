#!/bin/bash

# Import only the latest Lawley file

LATEST=$(ls ~/Downloads/*Lawley*.xlsx | grep -E "[0-9]{13}_Lawley_[0-9]{8}\.xlsx" | sort | tail -1)

if [ -z "$LATEST" ]; then
    echo "No Lawley files found!"
    exit 1
fi

echo "Importing latest file: $(basename "$LATEST")"
node scripts/import-excel-to-postgres.js "$LATEST"
