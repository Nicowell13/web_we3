#!/usr/bin/env bash
set -u
cd /home/ubuntu/web_we3
for k in DOKU_CLIENT_ID DOKU_SECRET_KEY DOKU_SHARED_KEY DOKU_ENV DOKU_URL DOKU_CHECKOUT_PATH NEXT_PUBLIC_DOKU_ENV NEXT_PUBLIC_API_URL; do
  v=$(grep -m1 "^${k}=" .env | cut -d= -f2- || true)
  case "$k" in
    DOKU_ENV|DOKU_URL|DOKU_CHECKOUT_PATH|NEXT_PUBLIC_DOKU_ENV|NEXT_PUBLIC_API_URL)
      if [ -n "$v" ]; then echo "$k=$v"; else echo "$k=MISSING"; fi ;;
    *)
      if [ -n "$v" ]; then echo "$k=PRESENT(len:${#v})"; else echo "$k=MISSING"; fi ;;
  esac
done
