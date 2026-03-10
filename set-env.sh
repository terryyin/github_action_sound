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
corepack prepare pnpm@10.31.0 --activate
corepack use pnpm@10.31.0
pnpm --frozen-lockfile recursive install
