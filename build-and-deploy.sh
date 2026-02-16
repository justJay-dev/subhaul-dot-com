#!/bin/bash
# ssh into the remote host and run the build command, docker-compose build && docker compose up -d
if [ -z "$1" ]; then
  echo "Usage: $0 <ip_address>"
  exit 1
fi

ssh -i ~/.ssh/id_rsa_ubuntu ubuntu@$1 "cd /home/ubuntu/dot-com-astro && docker compose build && docker compose up -d"