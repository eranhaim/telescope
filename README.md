# Telescope - Telegram Mini App

A profile catalog Telegram Mini App with image/video galleries, built with React, Node.js, MongoDB, and S3.

## Project Structure

```
telescope/
  backend/    Express API server (TypeScript)
  frontend/   React Mini App (Vite + TailwindCSS)
  bot/        Telegram bot
```

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` in the project root and fill in the values:

```bash
cp .env.example .env
```

Then symlink or copy `.env` into each sub-project, or set the env vars in your deployment.

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../bot && npm install
```

### 3. Create the Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts to get your bot token
3. Send `/newapp` to register a Mini App and link it to your bot
4. Set the Mini App URL to your deployed frontend HTTPS URL

### 4. Run Development Servers

**Backend** (requires MongoDB running locally):
```bash
cd backend
npm run dev
```

**Frontend** (proxies /api to backend on port 3000):
```bash
cd frontend
npm run dev
```

**Bot**:
```bash
cd bot
npm run dev
```

### 5. Deployment

The frontend must be served over HTTPS for Telegram Mini Apps to work.

- Build frontend: `cd frontend && npm run build` (outputs to `dist/`)
- Build backend: `cd backend && npm run build` (outputs to `dist/`)
- Build bot: `cd bot && npm run build` (outputs to `dist/`)

### Admin Panel

Navigate to `/admin` in the frontend to access the password-protected admin panel for managing profiles and media.
