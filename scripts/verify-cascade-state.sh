#!/usr/bin/env bash
# Verify Sample and AuditEvent state for cascade tests (TC-4.31, TC-4.32, TC-4.33)
# Usage: ./scripts/verify-cascade-state.sh <sampleId>
# Profile: Nimbus

set -e
SAMPLE_ID="${1:?Usage: $0 <sampleId>}"

SAMPLE_TABLE="Sample-iwxkyxztx5cudp7drfybj4nsgq-NONE"
EXAM_TABLE="Exam-iwxkyxztx5cudp7drfybj4nsgq-NONE"
AUDIT_TABLE="AuditEvent-iwxkyxztx5cudp7drfybj4nsgq-NONE"
PROFILE="Nimbus"

echo "=== Sample $SAMPLE_ID ==="
aws dynamodb get-item \
  --table-name "$SAMPLE_TABLE" \
  --key "{\"id\": {\"S\": \"$SAMPLE_ID\"}}" \
  --profile "$PROFILE" \
  --output json \
  --query 'Item.{id:id.S,barcode:barcode.S,status:status.S}' 2>/dev/null || echo "Sample not found"

echo ""
echo "=== Exams for Sample $SAMPLE_ID ==="
aws dynamodb scan \
  --table-name "$EXAM_TABLE" \
  --filter-expression "sampleId = :sid" \
  --expression-attribute-values "{\":sid\": {\"S\": \"$SAMPLE_ID\"}}" \
  --projection-expression "id,#st" \
  --expression-attribute-names '{"#st":"status"}' \
  --profile "$PROFILE" \
  --output json \
  --query 'Items[*].{id:id.S,status:status.S}' 2>/dev/null || echo "No exams"

echo ""
echo "=== SPECIMEN_COMPLETED AuditEvents for Sample $SAMPLE_ID ==="
aws dynamodb query \
  --table-name "$AUDIT_TABLE" \
  --index-name auditEventsByEntityId \
  --key-condition-expression "entityId = :eid" \
  --filter-expression "#act = :act" \
  --expression-attribute-names '{"#act":"action"}' \
  --expression-attribute-values "{\":eid\": {\"S\": \"$SAMPLE_ID\"}, \":act\": {\"S\": \"SPECIMEN_COMPLETED\"}}" \
  --profile "$PROFILE" \
  --output json \
  --query 'Items[*].{action:action.S,timestamp:timestamp.S,metadata:metadata}' 2>/dev/null || echo "No audit events"
