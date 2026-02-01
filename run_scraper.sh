#!/bin/bash
# Run the full scraper in background
cd /Users/raj/ctf/aws-iam-webapp
nohup python3 fetch_iam_full.py > scrape.log 2>&1 &
echo "Scraper started in background. Check scrape.log for progress."
echo "This will take 5-10 minutes to complete."
