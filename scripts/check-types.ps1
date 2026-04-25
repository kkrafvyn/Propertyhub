#!/usr/bin/env pwsh
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npx tsc --noEmit > tsc-errors.txt 2>&1
