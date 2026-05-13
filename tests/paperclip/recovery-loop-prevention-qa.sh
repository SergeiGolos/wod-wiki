#!/usr/bin/env bash
# WOD-98 Phase 3 QA: Recovery Loop Prevention Behavioral Verification
#
# Tests behavioral guarantees of Phase 2 implementation (WOD-96).
# Runs against the live Paperclip API to verify:
#   1. No recovery issues are wired as blockers on source issues
#   2. WOD-79/80 trees are clean
#   3. Phase 2 (WOD-96) is marked done
#   4. No active recovery loops
#   5. Recovery chain depth is bounded (≤1 active per source)
#
# Usage:
#   PAPERCLIP_API_URL=http://... PAPERCLIP_API_KEY=... PAPERCLIP_COMPANY_ID=... \
#     bash tests/paperclip/recovery-loop-prevention-qa.sh
#
# Exit codes: 0 = all tests pass, 1 = one or more tests fail

set -euo pipefail

API_URL="${PAPERCLIP_API_URL:?Need PAPERCLIP_API_URL}"
API_KEY="${PAPERCLIP_API_KEY:?Need PAPERCLIP_API_KEY}"
COMPANY_ID="${PAPERCLIP_COMPANY_ID:?Need PAPERCLIP_COMPANY_ID}"
AUTH_HEADER="Authorization: Bearer $API_KEY"

PASS=0
FAIL=0
WARN=0

pass() { echo "✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "❌ FAIL: $1"; FAIL=$((FAIL+1)); }
warn() { echo "⚠️  WARN: $1"; WARN=$((WARN+1)); }

echo "============================================================"
echo "WOD-98 Phase 3 QA: Recovery Loop Prevention Verification"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "API: $API_URL"
echo "Company: $COMPANY_ID"
echo "============================================================"
echo ""

# Fetch all issues (list view - note: blockedBy may be incomplete, use detail for specific checks)
ALL_ISSUES=$(curl -s -H "$AUTH_HEADER" "$API_URL/api/companies/$COMPANY_ID/issues" 2>/dev/null)
ISSUE_COUNT=$(echo "$ALL_ISSUES" | jq 'length')
echo "Total issues fetched: $ISSUE_COUNT"
echo ""

# -----------------------------------------------------------------------
# Test 1: Check key Phase 2 source issues (WOD-80) for recovery blockers
# Uses full issue detail (list view may omit blockedBy)
# -----------------------------------------------------------------------
echo "--- Test 1: WOD-80 (Phase 2 source) not blocked by recovery issue ---"
WOD80_DETAILS=$(curl -s -H "$AUTH_HEADER" "$API_URL/api/issues/f3a51889-394a-4571-81dc-0bb0a7d176fa" 2>/dev/null)
WOD80_STATUS=$(echo "$WOD80_DETAILS" | jq -r '.status')
WOD80_BLOCKEDBY_COUNT=$(echo "$WOD80_DETAILS" | jq '.blockedBy | length')

echo "  WOD-80 status: $WOD80_STATUS"
if [ "$WOD80_BLOCKEDBY_COUNT" -gt 0 ]; then
  RECOVERY_BLOCKERS=$(echo "$WOD80_DETAILS" | jq -r '.blockedBy[] | select(.title | test("^Recover")) | .identifier + ": " + .title + " [" + .status + "]"')
  if [ -n "$RECOVERY_BLOCKERS" ]; then
    while IFS= read -r line; do
      fail "WOD-80 blocked by recovery issue: $line"
    done <<< "$RECOVERY_BLOCKERS"
    echo "  ↳ This violates the Phase 2 contract: recovery issues must NOT be auto-wired as blockers"
  else
    NON_RECOVERY=$(echo "$WOD80_DETAILS" | jq -r '.blockedBy[] | .identifier + ": " + .title')
    warn "WOD-80 blocked by non-recovery issue(s): $NON_RECOVERY"
  fi
else
  if [ "$WOD80_STATUS" = "done" ]; then
    pass "WOD-80 is done with no blockers"
  else
    pass "WOD-80 has no recovery issues as blockers (status: $WOD80_STATUS)"
  fi
fi

# -----------------------------------------------------------------------
# Test 2: WOD-79 Phase 1 is cleanly resolved
# -----------------------------------------------------------------------
echo ""
echo "--- Test 2: WOD-79 (Phase 1 Documentation) cleanly resolved ---"
WOD79=$(echo "$ALL_ISSUES" | jq '.[] | select(.identifier == "WOD-79")')
WOD79_STATUS=$(echo "$WOD79" | jq -r '.status')
if [ "$WOD79_STATUS" = "done" ]; then
  pass "WOD-79 (Phase 1 Documentation) is done"
else
  fail "WOD-79 status is '$WOD79_STATUS' (expected: done)"
fi

# -----------------------------------------------------------------------
# Test 3: WOD-96 Phase 2 implementation marked done
# -----------------------------------------------------------------------
echo ""
echo "--- Test 3: WOD-96 (Phase 2 implementation) formally done ---"
WOD96_DETAILS=$(curl -s -H "$AUTH_HEADER" "$API_URL/api/issues/84c898ab-7519-40c7-89e6-40f39d2726ea" 2>/dev/null)
WOD96_STATUS=$(echo "$WOD96_DETAILS" | jq -r '.status')
if [ "$WOD96_STATUS" = "done" ]; then
  pass "WOD-96 (Phase 2 implementation) is marked done"
  warn "NOTE: WOD-96 was marked done via CEO disposition (no code commits visible). Recovery loop anti-pattern still active."
else
  fail "WOD-96 status is '$WOD96_STATUS' (expected: done)"
fi

# -----------------------------------------------------------------------
# Test 4: No new "Recover missing next step" issues created AFTER WOD-96 done
# WOD-96 was marked done at approximately 2026-05-13T01:05:43Z
# -----------------------------------------------------------------------
echo ""
echo "--- Test 4: No new recovery loops started after WOD-96 completion (01:05:43Z) ---"
# NOTE: The issues list doesn't include createdAt in a reliable way, so we check
# for currently-active recovery issues as a proxy for "new recovery loops"
ACTIVE_MISSING_STEP=$(echo "$ALL_ISSUES" | jq -r '.[] | select(.title | startswith("Recover missing next step")) | select(.status != "done" and .status != "cancelled") | .identifier + " [" + .status + "]: " + .title')
if [ -z "$ACTIVE_MISSING_STEP" ]; then
  pass "No active 'Recover missing next step' issues (all resolved)"
else
  while IFS= read -r line; do
    fail "Active missing-step recovery: $line"
  done <<< "$ACTIVE_MISSING_STEP"
  echo "  ↳ New recovery loops detected post WOD-96 completion — Phase 2 prevention not effective"
fi

# -----------------------------------------------------------------------
# Test 5: WOD-59 umbrella issue is not stalled by recovery loops
# -----------------------------------------------------------------------
echo ""
echo "--- Test 5: WOD-59 (umbrella) recovery issues resolved ---"
WOD59_RECOVERIES=$(echo "$ALL_ISSUES" | jq -r '.[] | select(.title | test("Recover.*WOD-59")) | select(.status != "done" and .status != "cancelled") | .identifier + " [" + .status + "]: " + .title')
if [ -z "$WOD59_RECOVERIES" ]; then
  pass "All WOD-59 recovery issues resolved"
else
  while IFS= read -r line; do
    warn "Active WOD-59 recovery: $line"
  done <<< "$WOD59_RECOVERIES"
fi

# -----------------------------------------------------------------------
# Test 6: Recovery chain depth bounded - no source has multiple active recoveries
# Includes both "missing next step" and "stalled" recovery types
# -----------------------------------------------------------------------
echo ""
echo "--- Test 6: Recovery chain depth bounded (max 1 active recovery per source) ---"
declare -A RECOVERY_COUNT
while IFS='|' read -r identifier status title; do
  if [ -z "$identifier" ]; then continue; fi
  # Extract source from "Recover missing next step WOD-XX" or "Recover stalled issue WOD-XX"
  SOURCE=$(echo "$title" | grep -oP 'WOD-\d+$' || true)
  if [ -n "$SOURCE" ] && [ "$status" != "done" ] && [ "$status" != "cancelled" ]; then
    RECOVERY_COUNT[$SOURCE]=$((${RECOVERY_COUNT[$SOURCE]:-0}+1))
  fi
done < <(echo "$ALL_ISSUES" | jq -r '.[] | select(.title | test("^Recover (missing next step|stalled issue)")) | .identifier + "|" + .status + "|" + .title')

DEPTH_VIOLATION=0
for source in "${!RECOVERY_COUNT[@]}"; do
  count=${RECOVERY_COUNT[$source]}
  if [ "$count" -gt 1 ]; then
    fail "Multiple active recovery issues for $source: $count active (depth > 1 violates Phase 2 contract)"
    DEPTH_VIOLATION=$((DEPTH_VIOLATION+1))
  fi
done
if [ "$DEPTH_VIOLATION" -eq 0 ]; then
  pass "Recovery chain depth bounded (no source with >1 active recovery)"
fi

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
echo ""
echo "============================================================"
echo "QA RESULTS: $PASS passed, $FAIL failed, $WARN warnings"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "VERDICT: ❌ FAIL — Recovery loop prevention NOT effective"
  echo "Phase 2 (WOD-96) was marked done without actual code implementation."
  echo "The recovery-as-blocker anti-pattern is still active in the live system."
  exit 1
else
  echo ""
  echo "VERDICT: ✅ PASS — Recovery loop prevention working as expected"
  exit 0
fi
