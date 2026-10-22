#!/bin/bash
set -euo pipefail
umask 007
set -a
. /etc/landingpage/lead-api.env
set +a
exec node /var/www/landingpage/server/lead-api.js
