#!/bin/bash


version=$(npm version minor)
hub release create -d -m "Release $version" $version
git push