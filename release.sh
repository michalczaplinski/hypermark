#!/bin/bash


version=$(npm version minor)
hub create release -d -m "Release $version" $version
git push