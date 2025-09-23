# AI Digital Signage Platform

## Overview

This is a full-stack AI-powered digital signage platform built as a monorepo with a React frontend and Express.js backend. The system enables administrators to manage digital screens, upload media content, create playlists, and push content to connected display devices in real-time. The platform leverages AI for automatic content tagging and playlist optimization, with real-time WebSocket communication for instant content updates to player devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and building
- **UI Library**: shadcn/ui components built on Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Custom WebSocket hooks for live updates from server

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store for persistence
- **Real-time Communication**: WebSocket server for broadcasting content updates to player devices
- **File Upload**: Multer middleware for handling media file uploads with size and type validation

### Database Design
- **Core Entities**: Users, Organizations, Screens, Media, Playlists, PlaylistItems, Schedules, Broadcasts, AuditLogs
- **Relationships**: Organizations contain Users and Screens; Playlists contain ordered PlaylistItems referencing Media
- **Screen Management**: Device key-based authentication for player clients with online status tracking
- **Audit Trail**: Comprehensive logging of all user actions and system events

### Authentication & Authorization
- **Primary Auth**: Replit OAuth integration with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-based Access**: Admin, Editor, and Viewer roles with different permission levels
- **Player Authentication**: Unique device keys for screen identification and WebSocket connections

### Real-time Features
- **WebSocket Integration**: Bidirectional communication between admin interface and player devices
- **Live Updates**: Instant playlist updates, screen status monitoring, and broadcast notifications
- **Connection Management**: Automatic reconnection with exponential backoff for player reliability

### AI Integration Architecture
- **Content Analysis**: OpenAI GPT-5 integration for automatic image tagging and content analysis
- **Playlist Optimization**: AI-powered suggestions for content organization and scheduling
- **Fallback Strategy**: Deterministic responses when AI services are unavailable
- **Content Processing**: Automatic thumbnail generation and metadata extraction

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **OpenAI API**: GPT-5 model for content analysis and AI-powered features

### Core Libraries
- **Database**: Drizzle ORM with Neon serverless driver for PostgreSQL operations
- **UI Components**: Radix UI primitives with shadcn/ui wrapper components
- **Form Handling**: React Hook Form with Zod schema validation
- **File Processing**: Multer for uploads, sharp for image processing
- **WebSocket**: Native WebSocket with custom retry logic

### Development Tools
- **Build System**: Vite for frontend bundling and development server
- **Type Safety**: TypeScript across frontend, backend, and shared schema definitions
- **Code Quality**: ESBuild for production backend bundling
- **Styling**: Tailwind CSS with PostCSS for processing

### Authentication Provider
- **Replit OAuth**: OpenID Connect integration for user authentication
- **Session Management**: connect-pg-simple for PostgreSQL session storage