# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A sports trading card creation app. Users upload photos, crop them via drag-and-drop, fill out player details (name, position, team, jersey number, photographer credit), and submit cards for rendering. Built as a monorepo with pnpm workspaces.

## Commands

```bash
# Install dependencies
pnpm install

# Development (SST-first - this is the primary dev workflow)
AWS_PROFILE=prod npx sst dev       # Runs full stack with live AWS resources

# Build
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint

# Deploy to AWS
AWS_PROFILE=prod npx sst deploy
```

## Development Workflow

**Run in two terminals:**

Terminal 1 - SST (deploys infra, runs Lambda):
```bash
AWS_PROFILE=prod npx sst dev
```

Terminal 2 - Vite (frontend dev server):
```bash
cd client && pnpm dev
```

Access the app at `http://localhost:5173`.

**Environment variables:** `client/.env.development` contains `VITE_API_URL` and `VITE_ROUTER_URL`. Update these if SST outputs change (new stage, redeployed Lambda).

**In production:** Same-origin routing via CloudFront Router (`/api/*`, `/u/*`, `/r/*`).
**In dev:** Frontend calls Lambda URL directly (CORS enabled), media via Router.

## Architecture

### Monorepo Structure

- **client/** - React 19 + Vite + TanStack Router + TailwindCSS v4
- **server/** - Hono API (runs locally via tsx, deploys as Lambda)
- **shared/** - TypeScript types shared between client and server

### Key Technologies

- **SST v3** for AWS infrastructure (DynamoDB, S3, Lambda, CloudFront Router)
- **TanStack Query** for client data fetching
- **react-easy-crop** for drag-and-drop image cropping

### SST Resources (sst.config.ts)

- `Cards` - DynamoDB table with GSI on status+createdAt
- `Media` - S3 bucket for uploads and renders
- `Api` - Lambda function running Hono
- `CardRouter` - CloudFront router with routes:
  - `/api/*` → Lambda API
  - `/u/*` → S3 uploads
  - `/r/*` → S3 renders

### API Routes (server/src/index.ts)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads/presign` | Get presigned URL for S3 upload |
| POST | `/cards` | Create new card draft |
| GET | `/cards/:id` | Get card by ID |
| PATCH | `/cards/:id` | Update card |
| POST | `/cards/:id/submit` | Submit card for rendering |

### Data Flow

1. Client creates card draft → gets card ID
2. Client uploads original photo using presigned URL
3. User crops image (stored as normalized percentages)
4. Client can upload cropped image
5. Submit triggers render pipeline (renderKey stored on card)

### Type Aliases (tsconfig.json)

```
@server/* → ./server/src/*
@client/* → ./client/src/*
@shared/* → ./shared/src/*
```

## Development Notes

- Card status flow: `draft` → `submitted` → `rendered`
- Crop coordinates stored as normalized 0-1 floats, rotation as 0/90/180/270 degrees
- Max upload size: 15MB, allowed types: JPEG, PNG, WebP (render must be PNG)
- S3 keys are versioned with unique upload IDs to avoid cache issues:
  - `uploads/original/<cardId>/<uploadId>.<ext>`
  - `uploads/crop/<cardId>/<uploadId>.<ext>`
  - `renders/<cardId>/<renderId>.png`
- Public PATCH cannot set `status` or `renderKey` (server-controlled fields)
