# 6. Runtime View

## 6.1 User Login

```
Browser                  AuthController      AuthService       JwtService          DB
  |-- POST /api/auth/login -->|                   |                   |             |
  |                           |-- authenticate -->|                   |             |
  |                           |                   |--- loadUser ------|------------>|
  |                           |                   |<--- User ---------|-------------|
  |                           |                   |-- generateToken ->|             |
  |                           |<--- JWT token ----|<------------------|             |
  |<-- 200 { token } ---------|                   |                   |             |
```

## 6.2 Generate Meal Plan Suggestions

```
Browser                       MealPlanController    MealPlanService            SuggestionService       DB
  |-- POST /api/meal-plans/suggest -->|                    |                           |               |
  |                                   |--- generate ------>|                           |               |
  |                                   |                    |--- getSlotConfig ---------|-------------->|
  |                                   |                    |<-- slots -----------------|---------------|
  |                                   |                    |--- getFavorites ----------|-------------->|
  |                                   |                    |<-- favorites -------------|---------------|
  |                                   |                    |--- getRecent -------------|-------------->|
  |                                   |                    |<-- recent ----------------|---------------|
  |                                   |                    |--- suggest -------------->|               |
  |                                   |                    |  (filter by ingredient    |               |
  |                                   |                    |   seasonality,            |               |
  |                                   |                    |   exclude recent,         |               |
  |                                   |                    |   mix favorites + others) |               |
  |                                   |                    |<-- suggestions -----------|               |
  |                                   |<-- plan draft -----|                           |               |
  |<-- 200 { plan } ------------------|                    |                           |               |
```

## 6.3 Adjust Meal Plan

```
Browser                              MealPlanController  MealPlanService         DB
  |--- PATCH /api/meal-plans/{id} --------->|                   |                |
  |   { replace: [slotId], with: recipeId } |                   |                |
  |                                         |--- update ------->|                |
  |                                         |                   |--- save ------>|
  |                                         |                   |<-- ok ---------|
  |                                         |<-- updated plan --|                |
  |<-- 200 { plan } ------------------------|                   |                |
```
