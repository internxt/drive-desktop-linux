#!/usr/bin/env bash

set -u

BASE_URL="http://localhost:4567/hydration"
ROOT_FOLDER="$HOME/Internxt Drive"

function encode_relative_path() {
  python3 - "$1" "$ROOT_FOLDER" <<'PY'
import base64
import os
import sys

file_path = os.path.realpath(sys.argv[1])
root_folder = os.path.realpath(sys.argv[2])

if not file_path.startswith(root_folder):
    print("")
    sys.exit(0)

relative_path = file_path[len(root_folder):]
if relative_path == "":
    relative_path = "/"

print(base64.b64encode(relative_path.encode("utf-8")).decode("utf-8"))
PY
}

function copy_to_clipboard() {
  local value="$1"

  if command -v wl-copy >/dev/null 2>&1; then
    printf '%s' "$value" | wl-copy
    return
  fi

  if command -v xclip >/dev/null 2>&1; then
    printf '%s' "$value" | xclip -selection clipboard
    return
  fi

  if command -v xsel >/dev/null 2>&1; then
    printf '%s' "$value" | xsel --clipboard --input
    return
  fi
}

function copy_link() {
  local file_path="$1"
  local encoded
  encoded="$(encode_relative_path "$file_path")"

  if [ -z "$encoded" ]; then
    exit 0
  fi

  local response
  response="$(curl -sS -X POST "$BASE_URL/copy-link/$encoded" 2>/dev/null || true)"
  if [ -z "$response" ]; then
    exit 0
  fi

  local link
  link="$(python3 - "$response" <<'PY'
import json
import sys

response = sys.argv[1]
try:
    data = json.loads(response)
except json.JSONDecodeError:
    print("")
    sys.exit(0)

print(data.get("link", ""))
PY
)"

  if [ -n "$link" ]; then
    copy_to_clipboard "$link"
  fi
}

if [ "$#" -lt 2 ]; then
  exit 0
fi

action="$1"
shift

if [ "$action" = "copy-link" ]; then
  copy_link "$1"
  exit 0
fi
