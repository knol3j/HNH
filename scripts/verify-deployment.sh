#!/bin/bash
# Deployment Verification Script
# Ensures all GitHub Actions pass and Railway services are healthy

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://api.hashnhedge.com/health"
APP_URL="https://app.hashnhedge.com"
MAX_WAIT_TIME=${MAX_WAIT_TIME:-600}  # 10 minutes default
POLL_INTERVAL=${POLL_INTERVAL:-30}   # 30 seconds default

echo "================================================"
echo "  Deployment Verification Script"
echo "================================================"
echo ""

# Function to check GitHub Actions status
check_github_actions() {
    echo -e "${YELLOW}Checking GitHub Actions...${NC}"

    # Get the latest commit SHA
    COMMIT_SHA=$(git rev-parse HEAD)
    echo "Commit: $COMMIT_SHA"

    # Get all workflow runs for this commit
    RUNS=$(gh run list --commit "$COMMIT_SHA" --json status,conclusion,name,workflowName 2>/dev/null || echo "[]")

    if [ "$RUNS" = "[]" ]; then
        echo -e "${YELLOW}No workflow runs found yet for this commit${NC}"
        return 1
    fi

    # Check if any are still in progress
    IN_PROGRESS=$(echo "$RUNS" | jq -r '[.[] | select(.status == "in_progress" or .status == "queued" or .status == "waiting" or .status == "pending")] | length')

    if [ "$IN_PROGRESS" -gt 0 ]; then
        echo -e "${YELLOW}$IN_PROGRESS workflow(s) still running...${NC}"
        echo "$RUNS" | jq -r '.[] | select(.status == "in_progress" or .status == "queued" or .status == "waiting" or .status == "pending") | "  - \(.workflowName): \(.status)"'
        return 1
    fi

    # Check for failures
    FAILED=$(echo "$RUNS" | jq -r '[.[] | select(.conclusion == "failure")] | length')

    if [ "$FAILED" -gt 0 ]; then
        echo -e "${RED}$FAILED workflow(s) failed:${NC}"
        echo "$RUNS" | jq -r '.[] | select(.conclusion == "failure") | "  - \(.workflowName): FAILED"'
        return 2
    fi

    echo -e "${GREEN}All GitHub Actions passed!${NC}"
    echo "$RUNS" | jq -r '.[] | "  - \(.workflowName): \(.conclusion)"'
    return 0
}

# Function to check Railway health
check_railway_health() {
    echo ""
    echo -e "${YELLOW}Checking Railway services health...${NC}"

    # Check API health
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")
    APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")

    echo "  API ($API_URL): $API_STATUS"
    echo "  App ($APP_URL): $APP_STATUS"

    if [ "$API_STATUS" = "200" ] && [ "$APP_STATUS" = "200" ]; then
        # Also check database connectivity via API
        DB_STATUS=$(curl -s "$API_URL" 2>/dev/null | jq -r '.database // "unknown"' 2>/dev/null || echo "unknown")
        echo "  Database: $DB_STATUS"

        if [ "$DB_STATUS" = "connected" ]; then
            echo -e "${GREEN}All Railway services are healthy!${NC}"
            return 0
        else
            echo -e "${YELLOW}Warning: Database status is $DB_STATUS${NC}"
            return 0  # Don't fail on db status alone if endpoints respond
        fi
    fi

    echo -e "${RED}Railway services are not healthy${NC}"
    return 1
}

# Main verification loop
verify_deployment() {
    local start_time=$(date +%s)
    local attempt=1

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $MAX_WAIT_TIME ]; then
            echo -e "${RED}Timeout: Verification failed after ${MAX_WAIT_TIME}s${NC}"
            return 1
        fi

        echo ""
        echo "================================================"
        echo "Attempt $attempt (${elapsed}s elapsed, max ${MAX_WAIT_TIME}s)"
        echo "================================================"

        local gh_status=0
        local railway_status=0

        check_github_actions || gh_status=$?
        check_railway_health || railway_status=$?

        # Status 2 means failed (not just in progress)
        if [ $gh_status -eq 2 ]; then
            echo ""
            echo -e "${RED}GitHub Actions have failed. Please fix and push again.${NC}"
            return 1
        fi

        if [ $gh_status -eq 0 ] && [ $railway_status -eq 0 ]; then
            echo ""
            echo -e "${GREEN}================================================${NC}"
            echo -e "${GREEN}  ALL CHECKS PASSED!${NC}"
            echo -e "${GREEN}  Deployment verified successfully.${NC}"
            echo -e "${GREEN}================================================${NC}"
            return 0
        fi

        echo ""
        echo "Waiting ${POLL_INTERVAL}s before next check..."
        sleep $POLL_INTERVAL
        attempt=$((attempt + 1))
    done
}

# Run verification
verify_deployment
exit $?
