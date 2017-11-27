#!/bin/bash
set -e
DIRNAME=$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd -P)
name=$(basename $DIRNAME)
log_path="/var/log/$name"
sudo mkdir -p "$log_path"
sudo ndm install \
  --platform initd \
  --logs-directory "$log_path" \
  --node-bin " " \
  --sudo
# Add /bin/sh hashbang to start of file since ndm template doesn't have it
sudo sed -i -e "1i#!/bin/sh" "/etc/init.d/$name"
# Run on start
sudo update-rc.d "$name" defaults
