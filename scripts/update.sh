#!/run/current-system/sw/bin/bash
set -e

cd /srv/multi-user-daw

git fetch origin main
git checkout main
git reset --hard origin/main

npm ci

npm run migrate-up

systemctl restart multiuserdaw
