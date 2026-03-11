#!/bin/bash
echo "=== ビルド ==="
npm run build
echo "=== Base44にデプロイ ==="
echo "y" | base44 site deploy
base44 functions deploy
echo "=== GitHubに保存 ==="
git add .
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
git push
echo "=== 完了 ==="
