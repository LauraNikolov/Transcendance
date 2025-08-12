#!/bin/bash
set -euo pipefail


npx tsc --build --watch &
tsc_pid=$!
sleep 1

npx @tailwindcss/cli -i public/styles/tailwind.css -o public/styles/compiled.css --watch &
tailwind_pid=$!
sleep 1

node --watch src/app.js
node_pid=$!

trap "kill $tsc_pid $tailwind_pid $node_pid" EXIT

wait


