# University Lost Items Portal

A web application for university students to register for updates and report lost items.

## Features
- User registration via Visme forms
- Lost item reporting system
- PostgreSQL database integration with Neon
- Responsive design

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your Neon database URL
4. Run: `npm start`

## Deployment

### Render Deployment
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as Web Service

### Neon Database Setup
1. Create account at neon.tech
2. Create new database
3. Copy connection string to `.env` file

## Environment Variables
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NODE_ENV`: Set to 'production' for deployment