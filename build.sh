#!/bin/bash
# Gabungkan potongan di src/ menjadi site/index.html
set -e
cd "$(dirname "$0")"
{ cat src/head.html src/style.css src/body.html src/core.js src/views.js src/scan.js src/events.js src/tail.html; } > site/index.html
node -e "
const fs=require('fs');const h=fs.readFileSync('site/index.html','utf8');
const m=h.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
new Function(m[1]);console.log('sintaks JS ok, '+h.split('\n').length+' baris');"
