#!/usr/bin/env bash
# Delete all items from DynamoDB tables matching *-iwxkyxztx5cudp7drfybj4nsgq-NONE
# Uses AWS CLI with profile Nimbus
#
# Usage: ./delete-dynamodb-table-items.sh [region]
#   region: optional AWS region (e.g. us-east-1)

set -euo pipefail

PROFILE="Nimbus"
SUFFIX="-iwxkyxztx5cudp7drfybj4nsgq-NONE"

# Optional: pass AWS region as first argument
AWS_REGION="${1:-}"

list_matching_tables() {
  aws dynamodb list-tables --profile "$PROFILE" ${AWS_REGION:+--region "$AWS_REGION"} --output json \
    | jq -r --arg suffix "$SUFFIX" '.TableNames[] | select(endswith($suffix))'
}

delete_all_items_in_table() {
  local table="$1"
  local key_attrs
  key_attrs=$(aws dynamodb describe-table --table-name "$table" --profile "$PROFILE" ${AWS_REGION:+--region "$AWS_REGION"} \
    | jq -c '[.Table.KeySchema[].AttributeName]')

  local total=0
  local last_key=""

  while true; do
    local scan_opts=(--table-name "$table" --profile "$PROFILE")
    [[ -n "$AWS_REGION" ]] && scan_opts+=(--region "$AWS_REGION")
    [[ -n "$last_key" ]] && scan_opts+=(--exclusive-start-key "$last_key")

    local scan_result
    scan_result=$(aws dynamodb scan "${scan_opts[@]}" --output json)

    local item_count
    item_count=$(echo "$scan_result" | jq '.Items | length')

    if [[ "$item_count" -eq 0 ]]; then
      break
    fi

    # Build DeleteRequests in batches of 25 (DynamoDB limit)
    # Each line = one batch-write request: {"TableName": [{"DeleteRequest": {"Key": {...}}}, ...]}
    echo "$scan_result" | jq -c --argjson keys "$key_attrs" --arg tn "$table" '
      [.Items[] | (. as $item | reduce $keys[] as $k ({}; . + {($k): $item[$k]})) | {DeleteRequest: {Key: .}}]
      | _nwise(25)
      | {($tn): .}
    ' | while read -r batch_json; do
      aws dynamodb batch-write-item --request-items "$batch_json" --profile "$PROFILE" ${AWS_REGION:+--region "$AWS_REGION"} >/dev/null
    done

    total=$((total + item_count))

    last_key=$(echo "$scan_result" | jq -c 'if .LastEvaluatedKey then .LastEvaluatedKey else "" end')
    [[ -z "$last_key" || "$last_key" == "null" ]] && break
  done

  echo "$total"
}

main() {
  echo "Finding tables ending with: $SUFFIX"
  echo "Profile: $PROFILE"
  [[ -n "$AWS_REGION" ]] && echo "Region: $AWS_REGION"
  echo

  local tables
  tables=$(list_matching_tables)

  if [[ -z "$tables" ]]; then
    echo "No matching tables found."
    exit 0
  fi

  while IFS= read -r table; do
    [[ -z "$table" ]] && continue
    echo -n "Processing $table ... "
    local count
    count=$(delete_all_items_in_table "$table")
    echo "deleted $count items"
  done <<< "$tables"

  echo "Done."
}

main
