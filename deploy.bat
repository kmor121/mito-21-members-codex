@echo off
echo === ビルド ===
call npm run build
echo === Base44にデプロイ ===
echo y | base44 site deploy
call base44 functions deploy
echo === GitHubに保存 ===
git add .
git commit -m "deploy: %date% %time:~0,5%"
git push
echo === 完了 ===
