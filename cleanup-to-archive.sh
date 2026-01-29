#!/bin/bash

echo "🗂️  EV Charging Platform - Archive Cleanup"
echo "=========================================="
echo ""
echo "This will move old/unused files to .archive/ folder"
echo "Nothing will be deleted - all files backed up safely"
echo ""

cd /opt/ev-platform

# Create archive directory with timestamp
ARCHIVE_DIR=".archive/cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"/{root-docs,backend-files,ui-files,logs}

echo "📦 Archive location: $ARCHIVE_DIR"
echo ""

# Function to move file safely
move_to_archive() {
  local file=$1
  local dest=$2
  if [ -f "$file" ]; then
    echo "  📄 Archiving: $file"
    mv "$file" "$ARCHIVE_DIR/$dest/"
  fi
}

# 1. Archive temporary/log files
echo "1️⃣  Archiving temporary files..."
move_to_archive "Compiling.save" "root-docs"
move_to_archive "flashCharge-backend/cookies.txt" "logs"
move_to_archive "flashCharge-backend/dashboard.log" "logs"
move_to_archive "flashCharge-backend/server.log" "logs"
echo ""

# 2. Archive duplicate/outdated documentation
echo "2️⃣  Archiving outdated documentation..."
move_to_archive "FILE_STRUCTURE.md" "root-docs"
move_to_archive "DATA_FLOW_DIAGRAM.md" "root-docs"
move_to_archive "CURRENT_IMPLEMENTATION_REVIEW.md" "root-docs"
move_to_archive "CLEANUP_REVIEW.md" "root-docs"
move_to_archive "FIXES_SUMMARY.md" "root-docs"
move_to_archive "CHARGING_MODES_EXAMPLES.md" "root-docs"
move_to_archive "CHARGING_PREDICTION_BOX.md" "root-docs"
move_to_archive "INTEGRATED_SLIDERS.md" "root-docs"
move_to_archive "CHARGER_FIRMWARE_INTEGRATION.md" "root-docs"
move_to_archive "PRECHARGE_DATA_IMPLEMENTATION.md" "root-docs"
move_to_archive "PRECHARGE_IMPLEMENTATION_SUMMARY.md" "root-docs"
move_to_archive "PRECHARGE_STEVE_INTEGRATION.md" "root-docs"
move_to_archive "DATATRANSFER_STORAGE_FINDINGS.md" "root-docs"
move_to_archive "PRODUCTION_REFACTORING.md" "root-docs"
move_to_archive "INDUSTRY_STANDARD_FLOW.md" "root-docs"
move_to_archive "END_TO_END_TEST.md" "root-docs"
move_to_archive "QUICK_TEST.md" "root-docs"
move_to_archive "STEVE_INTEGRATION_OPTIMIZATION.md" "root-docs"
move_to_archive "QUICK_REFERENCE.md" "root-docs"
move_to_archive "SYSTEM_STATUS.md" "root-docs"
echo ""

# 3. Archive test files
echo "3️⃣  Archiving test files..."
move_to_archive "flashCharge-ui/test-auth.html" "ui-files"
move_to_archive "flashCharge-ui/test-e2e.js" "ui-files"
move_to_archive "flashCharge-ui/AUTH_INSTRUCTIONS.md" "ui-files"
echo ""

# 4. Archive old JS versions
echo "4️⃣  Archiving old JS versions..."
move_to_archive "flashCharge-ui/js/configure.js" "ui-files"
move_to_archive "flashCharge-ui/js/configure-refactored.js" "ui-files"
echo ""

# 5. Move websocket-test to dev-tools
echo "5️⃣  Moving dev tools..."
if [ -f "flashCharge-ui/websocket-test.html" ]; then
  mkdir -p dev-tools
  mv flashCharge-ui/websocket-test.html dev-tools/
  echo "  ✅ Moved websocket-test.html to dev-tools/"
fi
echo ""

# 6. Create archive README
cat > "$ARCHIVE_DIR/README.md" << 'EOF'
# Archived Files

**Date:** $(date)
**Reason:** Project cleanup for open-source release

## Contents

### root-docs/
Old and duplicate documentation files that have been superseded by consolidated docs.

### backend-files/
Temporary backend files (logs, cookies, etc.)

### ui-files/
Old test files and superseded JavaScript versions.

### logs/
Runtime log files (regenerated automatically).

## Restoration

To restore any file:
```bash
cp .archive/cleanup-TIMESTAMP/category/filename /opt/ev-platform/original-location/
```

## Safe to Delete

After confirming the system works correctly, this entire .archive/ folder can be deleted.
EOF

# 7. Update .gitignore
echo "6️⃣  Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Logs
*.log
dashboard.log
server.log

# Temporary files
*.save
cookies.txt

# Archive
.archive/
EOF
echo "  ✅ Updated .gitignore"
echo ""

# 8. Generate summary
ARCHIVED_COUNT=$(find "$ARCHIVE_DIR" -type f ! -name "README.md" | wc -l)

echo "=========================================="
echo "✅ Cleanup Complete!"
echo ""
echo "📊 Summary:"
echo "   Files archived: $ARCHIVED_COUNT"
echo "   Archive location: $ARCHIVE_DIR"
echo "   Original files: PRESERVED (not deleted)"
echo ""
echo "📁 Clean project structure maintained"
echo "🔒 All files safely backed up in .archive/"
echo ""
echo "Next steps:"
echo "1. Test your application"
echo "2. If everything works, keep archive for 30 days"
echo "3. After 30 days, delete .archive/ folder"
echo ""
echo "To restore a file:"
echo "   cp $ARCHIVE_DIR/category/filename original-location/"
echo ""
