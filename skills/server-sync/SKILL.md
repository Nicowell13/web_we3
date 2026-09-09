---
name: "server-sync"
description: "Synchronize server repository with local workspace, commit temporary files and reset server to match."
---

# Server sync

Sync server repository with local workspace.

1. Pull missing tmp files from server:
   scp -i tmp/wetri-key.pem ubuntu@108.136.89.77:/home/ubuntu/web_we3/tmp/*.ts tmp/
2. Add and commit locally:
   git add tmp/*.ts
   git commit -m "Add server-side tmp scripts for permanent sync"
   git push origin main
3. SSH into server and reset:
   ssh -i tmp/wetri-key.pem ubuntu@108.136.89.77 <<'EOF'
   cd /home/ubuntu/web_we3
   git fetch origin
   git reset --hard origin/main
   git clean -fdx
   rm -rf .next
   bun run build
   sudo systemctl restart wetri-backend wetri-frontend
   curl -fsS https://wetri.shop/api/health
   EOF
