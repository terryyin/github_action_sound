#!/usr/bin/env bash

set -eo pipefail

export PS1="(devbox)$PS1"
export NODE_PATH="$(readlink -e $(which node) | sed -E 's/\/bin\/node//g')"
export SOURCE_REPO_NAME=${PWD##*/}

echo "###################################################################################################################"
echo "                                                                                  "
echo "##   !! $SOURCE_REPO_NAME DEVELOPMENT ENVIRONMENT ;) !!"
echo "##   DevBox VERSION: `devbox version`                 "
echo "##   NODE_PATH: $NODE_PATH                            "
echo "##   NODE VERSION: `node --version`                   "
echo "                                                                                  "
echo "###################################################################################################################"

echo "Setting up PNPM..."
# Use pnpm from devbox (nix); avoid corepack — it is not on PATH for some Node nix outputs.
pnpm install --frozen-lockfile
