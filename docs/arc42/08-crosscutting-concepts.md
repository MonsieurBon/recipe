# 8. Crosscutting Concepts

## 8.1 Authentication and Authorization

- Stateless JWT-based authentication
- `JWTFilter` intercepts every request, validates the token, and sets the Spring Security context
- Public endpoints: `/api/auth/**` and all static resources
- All other `/api/**` endpoints require a valid JWT

## 8.2 Domain Model

```
+------------------+        +-------------------+
|     User         |        |    Recipe         |
|------------------|        |-------------------|
| username         |        | title             |
| email            |        | description       |
| password (hash)  |        | servings          |
| role             |        | prepTime          |
+-------+----------+        | cookTime          |
        |                   +--------+----------+
        | 1                     | 1          | 1
        |                       |            |
        | favorites *           |            | steps *
        v                       |            v
+------------------+            |   +-------------------+
|    Favorite      |            |   |   Step            |
|------------------|            |   |-------------------|
| user             |            |   | recipe            |
| recipe           |            |   | orderIndex        |
+------------------+            |   | instruction       |
                                |   +--------+----------+
        +                       |            | *
        |                       |            | ingredients (many-to-many)
        | 1                     |            v
        |                   +--------+----------+
+-------+-----------+       | RecipeIngredient  |
|    MealPlan       |       |-------------------|
|-------------------|       | recipe            |
| user              |       | ingredient        |
| weekStartDate     |       | amount            |
+--------+----------+       | unit              |
         | 1                | orderIndex        |
         |                  +--------+----------+
         | slots *                   | *
         v                           v
+-------------------+       +-------------------+
|   MealSlot        |       |   Ingredient      |
|-------------------|       |-------------------|
| dayOfWeek         |       | name              |
| mealType          |       | seasonMonths      |
| recipe            |       +-------------------+
+-------------------+
```

## 8.3 Error Handling

- Backend returns structured JSON error responses with appropriate HTTP status codes
- Frontend shows user-friendly error messages via Angular Material snackbar/toast
- Validation errors are returned as 400 with field-level details

## 8.4 Testing Strategy

- **TDD**: Write a failing test first, then implement
- **Backend**: JUnit 5 + Spring Boot Test; integration tests with Testcontainers for MySQL
- **Frontend**: Vitest for unit tests; co-located `*.spec.ts` files
