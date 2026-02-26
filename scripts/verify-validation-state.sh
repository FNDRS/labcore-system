#!/usr/bin/env bash
# Verify Exam and AuditEvent state after approve/reject (TC-4.16, TC-4.17, TC-4.18)
# Usage: ./scripts/verify-validation-state.sh <examId> [approved|rejected]
# Profile: Nimbus

set -e
EXAM_ID="${1:?Usage: $0 <examId> [approved|rejected]}"
EXPECTED="${2:-}"  # optional: approved | rejected

EXAM_TABLE="Exam-iwxkyxztx5cudp7drfybj4nsgq-NONE"
AUDIT_TABLE="AuditEvent-iwxkyxztx5cudp7drfybj4nsgq-NONE"
PROFILE="Nimbus"

echo "=== Verify Exam $EXAM_ID (profile: $PROFILE) ==="
aws dynamodb get-item \
  --table-name "$EXAM_TABLE" \
  --key "{\"id\": {\"S\": \"$EXAM_ID\"}}" \
  --profile "$PROFILE" \
  --output json \
  --query 'Item.{status:status.S,validatedBy:validatedBy.S,validatedAt:validatedAt.S}' 2>/dev/null || echo "Exam not found"

echo ""
echo "=== AuditEvents for Exam $EXAM_ID ==="
aws dynamodb query \
  --table-name "$AUDIT_TABLE" \
  --index-name auditEventsByEntityId \
  --key-condition-expression "entityId = :eid" \
  --expression-attribute-values "{\":eid\": {\"S\": \"$EXAM_ID\"}}" \
  --profile "$PROFILE" \
  --output json \
  --query 'Items[*].{action:action.S,entityType:entityType.S,entityId:entityId.S,userId:userId.S,timestamp:timestamp.S,metadata:metadata}' 2>/dev/null || echo "No audit events"

if [ -n "$EXPECTED" ]; then
  echo ""
  echo "=== Expected: $EXPECTED ==="
  STATUS=$(aws dynamodb get-item \
    --table-name "$EXAM_TABLE" \
    --key "{\"id\": {\"S\": \"$EXAM_ID\"}}" \
    --profile "$PROFILE" \
    --output text \
    --query 'Item.status.S' 2>/dev/null || echo "")
  if [ "$EXPECTED" = "approved" ] && [ "$STATUS" = "approved" ]; then
    echo "PASS: Exam status is approved"
  elif [ "$EXPECTED" = "rejected" ] && [ "$STATUS" = "rejected" ]; then
    echo "PASS: Exam status is rejected"
  elif [ "$EXPECTED" = "review" ] && [ "$STATUS" = "review" ]; then
    echo "PASS: Exam status is review (rework incidence)"
  elif [ -z "$STATUS" ]; then
    echo "FAIL: Exam not found"
  else
    echo "FAIL: Expected status=$EXPECTED, got status=$STATUS"
  fi
fi
