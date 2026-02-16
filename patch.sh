#!/bin/bash
# Usage: ./patch.sh <ip_address> [env_file]
if [ -z "$1" ]; then
  echo "Usage: $0 <ip_address> [env_file]"
  exit 1
fi

REMOTE_HOST="ubuntu@$1"
REMOTE_PATH="/home/ubuntu/subhaul-dot-com"
ENV_FILE="${2:-.env}"

# list of directories to omit (adjust as needed)
EXCLUDES=(".git" "node_modules" "dist")

# build rsync exclude options
RSYNC_EXCLUDES=()
for dir in "${EXCLUDES[@]}"; do
  RSYNC_EXCLUDES+=("--exclude=$dir")
done

# zip existing directory on remote host before syncing new copy
echo "Backing up existing subhaul-dot-com directory..."
ssh -i ~/.ssh/id_rsa_ubuntu "$REMOTE_HOST" "cd ~/ && zip -r subhaul-dot-com.zip subhaul-dot-com && echo 'Backup completed'"

# remove the old directory
ssh -i ~/.ssh/id_rsa_ubuntu "$REMOTE_HOST" "rm -rf ${REMOTE_PATH}"


rsync -avz -e "ssh -i ~/.ssh/id_rsa_ubuntu" "${RSYNC_EXCLUDES[@]}" ./ "$REMOTE_HOST:$REMOTE_PATH"

# Copy the env file to the remote host
echo "Copying environment file to remote host..."
ssh -i ~/.ssh/id_rsa_ubuntu "$REMOTE_HOST" "mkdir -p ${REMOTE_PATH}"
scp -i ~/.ssh/id_rsa_ubuntu "$ENV_FILE" "$REMOTE_HOST:${REMOTE_PATH}/.env"
echo "Environment file deployed"