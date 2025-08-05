# Overview

This is a full-stack web application built with React, Express, and TypeScript. The project appears to be a restaurant/food service application called "TableTap Kitchen" with features for displaying menu items, customer management, and rewards functionality. It uses a modern tech stack with shadcn/ui components for the frontend and Drizzle ORM for database operations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development**: tsx for TypeScript execution in development
- **Build**: esbuild for production bundling
- **Storage Interface**: Abstracted storage layer with in-memory implementation (MemStorage)

## Database & ORM
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Centralized schema definition in `/shared/schema.ts`
- **Migrations**: Drizzle Kit for database migrations
- **Connection**: Neon Database serverless driver for PostgreSQL connections
- **Current Schema**: Users table with id, username, and password fields

## Project Structure
- **Monorepo**: Client and server code in separate directories with shared types
- **Client**: React application in `/client` directory
- **Server**: Express API in `/server` directory  
- **Shared**: Common types and schemas in `/shared` directory
- **Path Aliases**: TypeScript path mapping for clean imports (@/, @shared/)

## Development & Build
- **Development**: Concurrent client (Vite) and server (tsx) development
- **Production**: Vite builds client to `/dist/public`, esbuild bundles server to `/dist`
- **Type Safety**: Strict TypeScript configuration across all packages
- **Hot Reload**: Vite HMR for client, tsx watch mode for server

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Connection**: Via DATABASE_URL environment variable

## UI Framework
- **Radix UI**: Comprehensive component primitives for accessible UI
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library with consistent styling
- **Lucide React**: Icon library for UI components

## Development Tools
- **Vite**: Frontend build tool with React plugin
- **Replit Integration**: Runtime error overlay and cartographer plugins for Replit environment
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

## Utility Libraries
- **clsx & tailwind-merge**: CSS class manipulation utilities
- **date-fns**: Date manipulation library
- **class-variance-authority**: Type-safe variant management for components
- **nanoid**: Unique ID generation

## Current Implementation Status
- Basic user schema and storage interface defined
- Frontend home page with restaurant branding and featured items
- Component library fully set up with shadcn/ui
- API routes structure prepared but not yet implemented
- Authentication and session management dependencies included but not configured