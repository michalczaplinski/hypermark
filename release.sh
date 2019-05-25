#!/bin/bash
set -eu -o pipefail
set -a

# This script takes care of all the release stuff
# Usage: 
# ./release.sh --patch | --minor | --major

USING_RELEASE_SCRIPT=true

case "$1" in
    --patch) 
      version=patch
      ;;
    --minor)
      version=minor
      ;;
    --major)
      version=major
      ;;
    *)
      echo "Error: Unsupported argument $1" >&2
      echo "Usage: ./release.sh --patch | --minor | --major" >&2
      exit 1
      ;;
esac

version_name=$(npm version $version)
hub release create -d -m "Release $version_name" $version_name
git push