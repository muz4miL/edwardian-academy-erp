#!/bin/bash
curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"Owner@2024"}' | head -c 300
echo ""
echo "---"
curl -s -X POST https://api.edwardiansacademy.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"Owner@2024"}' | head -c 300
echo ""
