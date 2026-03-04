#!/usr/bin/env bash
# Verify Sample table status counts for Technician debugging.
# Usage: ./scripts/verify-sample-status-counts.sh
# Profile: Nimbus

set -e
SAMPLE_TABLE="${SAMPLE_TABLE:-Sample-maeykkjh25co7jqilplub5hjne-NONE}"
PROFILE="${PROFILE:-Nimbus}"

echo "=== Sample table: $SAMPLE_TABLE ==="
echo "Technician-relevant statuses: ready_for_lab, received, inprogress, completed, rejected"
echo ""

aws dynamodb scan \
  --table-name "$SAMPLE_TABLE" \
  --projection-expression "#st" \
  --expression-attribute-names '{"#st":"status"}' \
  --profile "$PROFILE" \
  --output json \
  --no-cli-pager | jq -r '
    [.Items[].status.S] 
    | group_by(.) 
    | map({status: .[0], count: length}) 
    | sort_by(-.count)
    | .[]
    | "\(.status): \(.count)"
  '

echo ""
echo "Technician total (ready_for_lab + received + inprogress + completed + rejected):"
aws dynamodb scan \
  --table-name "$SAMPLE_TABLE" \
  --projection-expression "#st" \
  --expression-attribute-names '{"#st":"status"}' \
  --profile "$PROFILE" \
  --output json \
  --no-cli-pager | jq -r '
    [.Items[].status.S] 
    | map(select(. == "ready_for_lab" or . == "received" or . == "inprogress" or . == "completed" or . == "rejected"))
    | length
  ' | xargs -I {} echo "{} samples"
