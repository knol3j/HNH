#!/bin/bash
# Push and Verify Script
# Pushes changes and waits for all CI/CD to complete successfully

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE=false
SKIP_VERIFY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        --skip-verify)
            SKIP_VERIFY=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo "================================================"
echo "  Git Push with Deployment Verification"
echo "================================================"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: You have uncommitted changes:"
    git status --porcelain
    echo ""

    if [ "$FORCE" = false ]; then
        read -p "Continue anyway? (y/N) " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 1
        fi
    fi
fi

# Push to remote
echo "Pushing to remote..."
if ! git push; then
    echo "Git push failed!"
    exit 1
fi

echo "Push successful!"
echo ""

if [ "$SKIP_VERIFY" = true ]; then
    echo "Skipping verification (--skip-verify flag set)"
    exit 0
fi

# Wait a moment for GitHub Actions to start
echo "Waiting 10 seconds for CI/CD to start..."
sleep 10

# Run verification
echo ""
"$SCRIPT_DIR/verify-deployment.sh"
exit $?
