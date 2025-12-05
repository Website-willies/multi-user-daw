#!/run/current-system/sw/bin/bash
set -e

cd /srv/multi-user-daw

git fetch origin main

LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Deploying..."

    git checkout main
    git reset --hard origin/main

    npm ci
    npm run migrate-up
    systemctl restart multiuserdaw

else
    echo "No new commits."
fi