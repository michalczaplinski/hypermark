#!/bin/bash
set -eu -o pipefail
set -a

# This script takes care of all the release stuff
# Usage: 
# ./release.sh --patch | --minor | --major

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
version_number=$(cat package.json | grep version | grep -o "\d\.\d\.\d")

echo "Releasing a ${version} version number ${version_number}\n"

echo "Creating a new release\n"
hub release create -d -m "Release $version_name" $version_name

git push
git push --tags