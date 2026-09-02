#!/usr/bin/env bash
# Exchange the long-lived Yahoo refresh token for a ~1h access token.
# Prints the access token to stdout; everything else goes to stderr.
# Requires: YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, YAHOO_REFRESH_TOKEN in env.
set -euo pipefail

: "${YAHOO_CLIENT_ID:?YAHOO_CLIENT_ID not set}"
: "${YAHOO_CLIENT_SECRET:?YAHOO_CLIENT_SECRET not set}"
: "${YAHOO_REFRESH_TOKEN:?YAHOO_REFRESH_TOKEN not set}"

resp=$(curl -s --max-time 15 -X POST https://api.login.yahoo.com/oauth2/get_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=${YAHOO_CLIENT_ID}" \
  --data-urlencode "client_secret=${YAHOO_CLIENT_SECRET}" \
  --data-urlencode "refresh_token=${YAHOO_REFRESH_TOKEN}" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "redirect_uri=oob")

token=$(printf '%s' "$resp" | jq -r '.access_token // empty')

if [ -z "$token" ]; then
  # Never echo the raw response on failure — it can contain token material.
  err=$(printf '%s' "$resp" | jq -r '.error_description // .error // "unknown error"')
  echo "yahoo-access-token: refresh failed: ${err}" >&2
  exit 1
fi

printf '%s\n' "$token"
