# AWS IAM Actions Reference

A modern web application that displays all AWS IAM actions, resources, and condition keys across all AWS services in a clean, searchable format.

**Live Demo**: https://yourusername.github.io/aws-iam-reference/

## Features

- **20,256+ IAM Actions** from 441 AWS services
- **Search** by action name
- **Filter by Service** - All 441 AWS services
- **Filter by Access Level** - List, Read, Write, Tagging, Permissions management
- **Tag Support Filters**: RequestTag, ResourceTag, aws:TagKeys
- **Resource-Level Permissions** indicators
- **ARN Format** display for each resource type
- **Responsive design** for all devices

## Quick Start

### Local Development

```bash
# Install dependencies
cd my-app
npm install

# Run development server
npm run dev
# Open http://localhost:3000
```

### Build

```bash
cd my-app
npm run build
# Output will be in my-app/dist/
```

### Local Preview

```bash
cd my-app/dist
python3 -m http.server 3000
# Open http://localhost:3000
```

## Deploy to GitHub Pages

### Option 1: Automated Deployment (Recommended)

1. **Fork/Create this repository** on GitHub
2. **Update `next.config.js`**:
   ```javascript
   basePath: '/your-repo-name',
   assetPrefix: '/your-repo-name/',
   ```
3. **Push to main branch** - GitHub Actions will auto-deploy
4. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - Wait for the first deployment

### Option 2: Manual Deployment

```bash
# 1. Build the project
cd my-app
npm run build

# 2. Copy data to dist
cp public/aws-iam-consolidated.json dist/

# 3. Create gh-pages branch
cd ..
git checkout --orphan gh-pages

# 4. Copy dist contents to root
cp -r my-app/dist/* .

# 5. Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

## Data Source

Data is sourced from the [AWS Service Authorization Reference API](https://servicereference.us-east-1.amazonaws.com/).

To update the data:

```bash
python3 fetch_iam_data.py
```

## Project Structure

```
.
├── my-app/                    # Next.js web application
│   ├── app/                   # Next.js app directory
│   ├── components/            # React components
│   ├── public/                # Static files (including data)
│   ├── types/                 # TypeScript types
│   └── dist/                  # Build output (generated)
├── data/                      # Fetched IAM data
├── fetch_iam_data.py          # Script to fetch AWS IAM data
└── .github/workflows/         # GitHub Actions workflows
```

## Statistics

- **441** AWS services
- **20,256** IAM actions
- **2,143** resource types
- **2,311** condition keys
- Last updated: 2026-02-01

## License

MIT
