# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A recipe management web application with a Spring Boot 4 (Java 21) backend and Angular 21 frontend, using MySQL with Flyway migrations and JWT-based authentication.

## Build & Development Commands

### Backend (Maven)
- `./mvnw spring-boot:run` — run the Spring Boot app
- `./mvnw clean package` — full build (includes frontend build, lint, format check, and tests via frontend-maven-plugin)
- `./mvnw test` — run backend tests + frontend lint/format/tests
- `./mvnw spotless:apply` — auto-format Java code (Google Java Format)
- `./mvnw spotless:check` — check Java formatting

### Frontend (npm)
- `npm start` — dev server (ng serve)
- `npm test` — run Angular tests (vitest, watch mode)
- `npm run test:ci` — run tests once (no watch)
- `npm run lint` — ESLint with auto-fix
- `npm run lint:check` — ESLint check only
- `npm run format` — Prettier format (ts, html)
- `npm run format:check` — Prettier check only

## Architecture

### Backend
- **Package**: `ch.ethy.recipes`
- **Security**: JWT-based stateless auth with `JWTFilter` → `JwtService` → Spring Security. Endpoints under `/api/(!auth)/**` require authentication; everything else is public.
- **Auth flow**: `AuthController` handles login/register, `AuthService` coordinates, `DbUserDetailsService` loads users, BCrypt for passwords.
- **Database**: MySQL with Flyway migrations in `src/main/resources/db/migration/`. JPA entities extend `BaseEntity`.
- **Frontend serving**: `AngularForwardController` forwards non-API routes to `index.html` for Angular routing. Static files served from `classpath:/static/browser/`.

### Frontend
- **Source root**: `src/main/webapp/` (not standard `src/`)
- **Build output**: `target/classes/static` (served by Spring Boot)
- **UI framework**: Angular Material with SCSS, custom Material theme in `material-theme.scss`
- **Components use class-based selectors** (e.g., `app-login` as kebab-case element)
- **HTTP auth**: `authenticationInterceptor` attaches JWT tokens to requests
- **Testing**: Vitest (not Karma/Jasmine). Test files are co-located as `*.spec.ts`.

## Development Workflow

- **TDD**: When developing code, write a failing test first, then implement the functionality to make it pass.
- **Thin components**: Keep Angular components as simple as possible; move logic (subscriptions, navigation, side effects) into services.

## Code Style

- **Java**: Google Java Format enforced via Spotless
- **TypeScript/HTML**: Prettier (100 char width, single quotes, Angular HTML parser)
- **ESLint**: angular-eslint with `app` prefix for components (kebab-case elements) and directives (camelCase attributes)
- **Angular components**: Use standalone components (no NgModules)

## Environment Variables

- `DB_HOST` / `DB_PORT` — MySQL connection (defaults: localhost:3306)
- `DB_PASSWORD` — MySQL app user password
- `FLYWAY_PASSWORD` — Flyway migration user password
