#!/bin/sh

# Load variables from the provided env file
if [ -f "$ENV_FILE" ]; then
  # Read env file, skip comments and empty lines, remove inline comments
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comment lines
    case "$line" in
      ''|'#'*) continue ;;
    esac
    # Remove inline comments and trim whitespace
    clean_line=$(echo "$line" | sed 's/#.*//' | sed 's/[[:space:]]*$//')
    # Skip if line is now empty
    [ -z "$clean_line" ] && continue
    # Export the variable
    export "$clean_line"
  done < "$ENV_FILE"
else
  echo "Environment file '$ENV_FILE' not found."
  exit 1
fi

# Run Uvicorn with loaded host/port
exec uvicorn api.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
