# Implementation Plan

## Current State

- **Auth & Users**: Full login/register flow (backend + frontend), JWT security with role-carrying claims read by `JWTFilter` on each request, user entity with roles
- **Recipe**: Bare entity with only `id` + `title`, matching DB table — no CRUD API, no frontend
- **Frontend**: Login, register, register-success components, auth interceptor, local storage service
- **Backend tests**: `JwtServiceTest`, `JWTFilterTest`, `AuthServiceTest` cover the security layer; other packages still untested

## What needs to be built

Everything marked "(planned)" in the architecture docs: recipe CRUD with search, favorites, meal planning, meal suggestions, and an administration backend.

Admin work is **not** deferred to the end. Each phase delivers a complete, working slice — including the admin endpoints and UI that let an administrator manage whatever entities that phase introduces. User administration has no feature dependencies, so it ships first.

---

## Phase 1: User Administration

Delivers the cross-cutting pieces (role-based authorization, admin shell, admin guard) so later phases can plug their own admin screens into an existing area.

### 1a. Backend — authorization foundation

- Extend `SecurityConfig` to require `ROLE_ADMIN` on every `/api/admin/**` endpoint
- Include the user's role as a claim in the JWT issued by `JwtService`; expose it on the login response so the frontend can render admin navigation without an extra call
- `admin/AdminUserController` — `/api/admin/users`
  - `GET` — paginated list with search by username/email
  - `GET /{id}` — single user
  - `PUT /{id}` — update username, email, role, enabled flag
  - `DELETE /{id}` — delete (prevent self-deletion)
- Delegate to `UserService`; no parallel persistence layer
- Tests (TDD): USER → 403, ADMIN → 200; self-deletion rejected; role change persists

### 1b. Frontend — admin shell & user admin

- `admin/admin.service.ts` — HTTP calls to `/api/admin/**`
- `admin/admin-guard.ts` — route guard that checks `AuthService` for the `ADMIN` role
- `admin/admin-shell/admin-shell.ts` — layout with side nav (initially just "Users")
- `admin/admin-user-list/admin-user-list.ts` — table with inline edit for role & enabled flag, delete action
- Route: `/admin` (with child `users`), protected by `AdminGuard`
- Show an "Admin" link in the main navigation only when the logged-in user has the `ADMIN` role
- Tests

---

## Phase 2: Recipe Management — Backend

### 2a. Domain model & migrations

- `V6__expand_recipes_table.sql` — add `description`, `servings`, `prep_time`, `cook_time`
- `V7__create_ingredients_table.sql` — shared ingredient entity: `id`, `name`
- `V8__create_ingredient_season_months_table.sql` — `ingredient_id` (FK), `month` (1–12); absence of rows means year-round
- `V9__create_recipe_ingredients_table.sql` — join table: `id`, `recipe_id` (FK), `ingredient_id` (FK), `amount`, `unit`, `order_index`
- `V10__create_steps_table.sql` — `id`, `recipe_id` (FK), `order_index`, `instruction`
- `V11__create_step_ingredients_table.sql` — many-to-many join: `step_id` (FK), `recipe_ingredient_id` (FK)
- Move `Recipe.java` from root package into `ch.ethy.recipes.recipe`
- Expand `Recipe` entity with all fields + `@OneToMany` for recipe ingredients and steps
- Create entities: `Ingredient` (shared, with season months), `RecipeIngredient` (quantity join), `Step` (with many-to-many to RecipeIngredient)

### 2b. CRUD API

- `RecipeRepository` — JpaRepository with search queries (by title/ingredient name)
- `IngredientRepository` — for looking up / creating shared ingredients
- `RecipeService` — CRUD + search; reuses existing ingredients by name
- `IngredientService` — CRUD; referential-integrity check on delete
- `RecipeController` — REST at `/api/recipes`
  - `GET /api/recipes` — list/search (query params: `q`, `season` to filter by current-month ingredient seasonality)
  - `GET /api/recipes/{id}` — single recipe with ingredients & steps
  - `POST /api/recipes` — create
  - `PUT /api/recipes/{id}` — update
  - `DELETE /api/recipes/{id}` — delete
- Request/response DTOs
- Tests (TDD): service unit tests, controller integration tests

### 2c. Admin endpoints (recipes & ingredients)

- `admin/AdminRecipeController` — `/api/admin/recipes`
  - `GET` — admin-level list (author, timestamps); delete via `DELETE /{id}`; edits reuse the standard `PUT /api/recipes/{id}`
- `admin/AdminIngredientController` — `/api/admin/ingredients`
  - `GET` list, `POST` create, `PUT /{id}` update (name + season months), `DELETE /{id}` (409 if still referenced)
- Delegate to `RecipeService` / `IngredientService`
- Authorization tests: USER → 403, ADMIN → 200

---

## Phase 3: Recipe Management — Frontend

### 3a. Models & service

- `recipe/recipe.model.ts` — TypeScript interfaces (Recipe, Ingredient, RecipeIngredient, Step)
- `recipe/recipe.service.ts` — HTTP calls to `/api/recipes` + tests

### 3b. Recipe list with search

- `recipe/recipe-list/recipe-list.ts` — list view with search bar and seasonality filter
- Route: `/recipes`

### 3c. Recipe detail (cooking view)

- `recipe/recipe-detail/recipe-detail.ts` — read-only view: ingredients + step-by-step instructions (steps show which ingredients they use)
- Route: `/recipes/:id`

### 3d. Recipe add/edit form

- `recipe/recipe-edit/recipe-edit.ts` — reactive form with dynamic ingredient/step lists; ingredient input with autocomplete against existing ingredients
- Routes: `/recipes/new` and `/recipes/:id/edit`

### 3e. Admin screens (recipes & ingredients)

- `admin/admin-recipe-list/admin-recipe-list.ts` — table with link to the recipe-edit route from 3d, delete action
- `admin/admin-ingredient-list/admin-ingredient-list.ts` — table with create/edit dialog (name, season months); delete surfaces the 409 "in use" error
- Add "Recipes" and "Ingredients" entries to the admin shell nav (from Phase 1)
- Child routes under `/admin`: `recipes`, `ingredients`
- Tests

---

## Phase 4: Favorites

### 4a. Backend

- `V12__create_favorites_table.sql` — `id`, `user_id` (FK), `recipe_id` (FK), unique constraint on (user_id, recipe_id)
- Utility to resolve the current `User` from the SecurityContext/JWT
- `Favorite` entity, `FavoriteRepository`, `FavoriteService`, `FavoriteController`
  - `GET /api/favorites` — current user's favorite recipe IDs
  - `PUT /api/favorites/{recipeId}` — add (idempotent)
  - `DELETE /api/favorites/{recipeId}` — remove
- Tests

### 4b. Frontend

- `favorite/favorite.service.ts` — API calls + local favorite state
- Integrate a favorite toggle button into the recipe list and detail components
- Tests

Favorites are intentionally user-scoped and not exposed in the admin area — admins manage users and can inspect a user's record, but favorites carry no curation value.

---

## Phase 5: Meal Planning & Suggestions

### 5a. Backend — Meal plan CRUD

- `V13__create_meal_plans_table.sql` — `id`, `user_id` (FK), `week_start_date`
- `V14__create_meal_slots_table.sql` — `id`, `meal_plan_id` (FK), `day_of_week`, `meal_type`, `recipe_id` (FK)
- `MealPlan`, `MealSlot` entities, `MealType` enum
- `MealPlanRepository`, `MealPlanService`, `MealPlanController`
  - `GET /api/meal-plans?week={date}` — get plan for a week
  - `POST /api/meal-plans` — create plan
  - `PATCH /api/meal-plans/{id}` — swap/replace individual slots
  - `DELETE /api/meal-plans/{id}` — delete plan
- Tests

### 5b. Backend — Suggestion service (per ADR-2)

- `SuggestionService` — server-side algorithm:
  1. Load user's favorites
  2. Load recent meal history (last N weeks)
  3. Filter recipes by ingredient seasonality (all ingredients must be in season for the target month)
  4. Exclude recently used recipes
  5. Mix favorites and non-favorites (configurable ratio)
  6. Fill each slot
- `POST /api/meal-plans/suggest` — returns a draft plan
- Unit tests with mock data

### 5c. Frontend

- `meal-plan/meal-plan.service.ts` — API calls
- `meal-plan/suggestion.service.ts` — suggestion handling
- `meal-plan/meal-plan/meal-plan.ts` — weekly grid view (days x meal types) with ability to swap individual slots
- Route: `/meal-plans`
- Tests

---

## Security follow-ups (not phase-bound)

- **Externalize JWT signing key** (critical): `JwtService.ENCODED_KEY` is hardcoded in source. Because the token now carries roles that `JWTFilter` trusts without a DB round-trip, anyone who reads the source can forge a token asserting `ROLE_ADMIN`. Move to `@Value("${jwt.secret}")` backed by a `JWT_SECRET` env var and rotate after deploy. The same literal is also duplicated in `JwtServiceTest`; once externalized, give the test its own dedicated key.
- **JWT `exp` claim + refresh flow**: Tokens currently never expire. `JWTFilter` now sources authorities from the token, so a demoted user keeps previous authorities until their token is replaced — which is never. Add an `exp` claim to `JwtService.generateToken`, have the parser enforce it, and introduce a refresh-token flow so the access-token lifetime can be short (e.g. 15 min) without forcing frequent re-logins. Until this is done, role revocation is effectively unbounded.
- **Split `ExpiredJwtException` handling in `JWTFilter`** (paired with expiry work): once tokens expire, the catch block should distinguish expired tokens from otherwise-invalid ones so the client can react appropriately (refresh vs re-login).
- **Role-revocation regression test** (paired with expiry + refresh): add a test that demotes a user mid-session and verifies the next refresh picks up the change, documenting the bounded-revocation guarantee.
- **IDOR on `GET /api/users/{id}`**: any authenticated `ROLE_USER` can fetch any other user's record with no ownership check. Add an ownership guard or restrict the endpoint to admins.
- **`show-sql: true` in `application.yaml`**: full SQL (including parameter values) is logged to stdout in all environments, potentially exposing PII. Disable for prod or route through a properly configured logger.

---

## Cross-cutting (applied throughout)

- **Small, deployable steps**: Each step is one reviewable unit — at least one test plus the implementation that satisfies it. Every step must leave the app green: compiles, all tests pass, no style violations. Prefer several small commits over one large one.
- **TDD**: Failing test first, then implementation
- **Current user resolution**: Helper to get the authenticated `User` from SecurityContext — needed for favorites and meal plans
- **Validation**: Jakarta Bean Validation on DTOs, 400 responses with field-level errors
- **OnPush** change detection on all new Angular components
- **Formatting**: `npm run format` + `./mvnw spotless:apply` after each batch of changes
- **Architecture docs**: Remove "(planned)" labels from `05-building-block-view.md` as features are completed

## Verification after each phase

1. `./mvnw test` — backend tests + frontend lint/format/tests
2. `npm run test:ci` — quick frontend feedback during development
