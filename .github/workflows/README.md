# GitHub Actions Workflows

This directory contains GitHub Actions workflows that run automatically on specific events.

## Workflows

### PR Checks (`pr-checks.yml`)

Runs automatically when a pull request is opened, synchronized, or reopened against the main branch. It performs:

- Linting
- Building the project
- Commenting on the PR with the results

### PR Preview Deployment (`pr-preview.yml`)

Creates a Vercel preview deployment for each pull request, allowing reviewers to see the changes in action.

### Security Scan (`security.yml`)

Runs security checks on dependencies:
- Automatically on each PR
- Weekly on a scheduled basis (Sundays at midnight)
- Reports vulnerabilities found in dependencies
- Highlights critical and high severity issues

### Nightly Build (`nightly-build.yml`)

Runs every day at 2 AM UTC to ensure the main branch is always in a good state:
- Checks out the main branch
- Runs lint check
- Builds the project
- Performs security audit
- Creates a detailed build report
- Sends email notifications when issues are found
- Can also be triggered manually with the "workflow_dispatch" event

### Production Deployment (`production-deploy.yml`)

Automatically deploys to production when changes are pushed to the main branch:
- Runs lint check and build process
- Deploys to Vercel production environment
- Sends a Slack notification about the deployment
- Can also be triggered manually with the "workflow_dispatch" event

## Required Environment Variables

The following environment variables need to be configured as GitHub repository secrets:

### Supabase Configuration (Required for all workflows)

| Secret Name | Description |
|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase instance URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `DATABASE_URL` | Your PostgreSQL database connection string |
| `DIRECT_URL` | Your direct PostgreSQL connection string |

### Vercel Deployment Configuration

To enable the Vercel preview deployments, you need to add the following secrets:

| Secret Name | Description | How to Get It |
|-------------|-------------|--------------|
| `VERCEL_TOKEN` | API token for Vercel | Go to Vercel dashboard > Settings > Tokens > Create token |
| `VERCEL_ORG_ID` | Your Vercel organization ID | From Vercel dashboard > Settings > General > Your ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | From Vercel project dashboard > Settings > General > Project ID |
| `VERCEL_SCOPE` | Usually your Vercel username or team name | Your username or team slug from Vercel |

### Email Notification Configuration

To enable email notifications for the nightly build, add these secrets:

| Secret Name | Description |
|-------------|-------------|
| `MAIL_SERVER` | SMTP server address |
| `MAIL_PORT` | SMTP server port (usually 587 for TLS) |
| `MAIL_USERNAME` | Email account username |
| `MAIL_PASSWORD` | Email account password or app password |
| `DEVOPS_EMAIL` | Email address to receive notifications |

### Slack Notification Configuration

To enable Slack notifications for production deployments, add this secret:

| Secret Name | Description |
|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Webhook URL for your Slack channel |

## Additional Configuration

You may need to customize these workflows based on your specific project requirements. For example:

- Adjust Node.js version if needed
- Add or remove script execution steps
- Configure additional test steps 