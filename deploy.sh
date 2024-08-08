#!/bin/sh
set -euo pipefail

version=$(deno run -A update-version.ts)

git add .
git commit -m "$version"
git push

deno publish

mkdir ../sholvoir.github.io/vocabulary/$version
cp vocabulary.txt ../sholvoir.github.io/vocabulary/$version/

cd ../sholvoir.github.io
git add .
git commit -m "vocabulary $version"
git push
