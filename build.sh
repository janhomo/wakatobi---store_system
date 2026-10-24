#!/bin/bash
# Gabungkan potongan di src/ menjadi site/index.html
set -e
cd "$(dirname "$0")"
{ cat src/head.html src/style.css src/body.html src/core.js src/views.js src/foto.js src/tempat.js src/material.js src/panduan.js src/impor.js src/saran.js src/scan.js src/events.js src/tail.html; } > site/index.html
node -e "
const fs=require('fs');const h=fs.readFileSync('site/index.html','utf8');
const i=h.lastIndexOf('<script>'),j=h.lastIndexOf('</script>');
new Function(h.slice(i+8,j));console.log('sintaks JS ok, '+h.split('\n').length+' baris');"
