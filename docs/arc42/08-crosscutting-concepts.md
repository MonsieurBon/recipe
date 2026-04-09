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
| password (hash)  |        | season            |
| role             |        | servings          |
+-------+----------+        | prepTime          |
        |                   | cookTime          |
        | 1                 +--------+----------+
        |                            | 1
        | favorites *                |
        v                            |
+------------------+        +--------+----------+
|    Favorite      |        |   Ingredient      |
|------------------|        |-------------------|
| user             |        | name              |
| recipe           |        | amount            |
+------------------+        | unit              |
                            +-------------------+
        +                            |
        |                            | 1
        | 1                          |
+-------+-----------+       +--------+----------+
|    MealPlan       |       |   Step            |
|-------------------|       |-------------------|
| user              |       | orderIndex        |
| weekStartDate     |       | instruction       |
+--------+----------+       +-------------------+
         | 1
         |
         | slots *
         v
+-------------------+
|   MealSlot        |
|-------------------|
| dayOfWeek         |
| mealType          |
| recipe            |
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
