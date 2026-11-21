#!/bin/sh
# Gives the app a new build number (date + count) in index.html and version.json, so open copies offer "Update".
# Run before committing a change to the app; the pre-commit hook does it for you.
cd "$(dirname "$0")"
today=$(date +%Y-%m-%d)
cur=$(sed -n 's/.*"build": *"\([^"]*\)".*/\1/p' version.json)
case "$cur" in "$today".*) n=$(( 1${cur##*.} - 100 + 1 ));; *) n=1;; esac
build=$(printf "%s.%02d" "$today" "$n")
sed -i '' "s/<meta name=\"app-build\" content=\"[^\"]*\">/<meta name=\"app-build\" content=\"$build\">/" index.html
printf '{ "build": "%s" }\n' "$build" > version.json
echo "build $build"
