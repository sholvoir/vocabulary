#!/bin/sh
set -euo pipefail

version=$(deno run -A jsr:@sholvoir/generic@0.0.14/update-version)

git add .
git commit -m "$version"
git push

#deno publish

cp vocabulary.txt ../sholvoir.github.io/vocabulary/vocabulary-$version.txt

cd ../sholvoir.github.io
git add .
git commit -m "vocabulary $version"
git push
