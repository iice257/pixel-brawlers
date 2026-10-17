#!/bin/bash
# portrait preview: regenerate data + screenshot. usage: tools/pv.sh surge|brick [extra query]
cd "$(dirname "$0")/.." && node tools/gen/emit.mjs >/dev/null && /tmp/shot.sh "http://localhost:5173/viewer?view=portrait&fighter=$1&hud=1&$2" media/qa/_p.png ${3:-1100x560}
