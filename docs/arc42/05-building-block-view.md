# 5. Building Block View

## 5.1 Level 1 -- System Overview

```
+------------------------------------------------------+
|                 Recipe & Meal Planner                |
|                                                      |
|  +----------------+          +--------------------+  |
|  |   Angular SPA  |  REST    |  Spring Boot       |  |
|  |   (Frontend)   | ------>  |  (Backend)         |  |
|  +----------------+          +--------------------+  |
|                                      |               |
|                                      | JPA           |
|                                      v               |
|                              +--------------------+  |
|                              |   MySQL Database   |  |
|                              +--------------------+  |
+------------------------------------------------------+
```

## 5.2 Level 2 -- Backend Components

```
ch.ethy.recipes
+---------------------------------------------------+
|  security/                                        |
|    AuthController          REST: /api/auth/**     |
|    AuthService             Login/register logic   |
|    JWTFilter, JwtService   Token handling         |
|    SecurityConfig          Spring Security setup  |
|                                                   |
|  user/                                            |
|    UserController          REST: /api/users/**    |
|    UserService             User management        |
|    UserRepository          JPA persistence        |
|                                                   |
|  recipe/ (planned)                                |
|    RecipeController        REST: /api/recipes/**  |
|    RecipeService           Recipe CRUD & search   |
|    RecipeRepository        JPA persistence        |
|                                                   |
|  favorite/ (planned)                              |
|    FavoriteController      REST: /api/favorites   |
|    FavoriteService         Favorite management    |
|    FavoriteRepository      JPA persistence        |
|                                                   |
|  mealplan/ (planned)                              |
|    MealPlanController      REST: /api/meal-plans  |
|    MealPlanService         Plan CRUD              |
|    SuggestionService       Meal suggestions       |
|    MealPlanRepository      JPA persistence        |
|                                                   |
|  admin/ (planned)                                 |
|    AdminUserController     REST: /api/admin/users |
|    AdminRecipeController   REST: /api/admin/...   |
|    AdminIngredientCtrl     REST: /api/admin/...   |
|    (ADMIN role required; reuses domain services)  |
|                                                   |
|  db/                                              |
|    BaseEntity              Shared JPA base class  |
|                                                   |
|  AngularForwardController  SPA route forwarding   |
+---------------------------------------------------+
```

## 5.3 Level 2 -- Frontend Components

```
src/main/webapp/app/
+------------------------------------------------------+
|  security/                                           |
|    LoginComponent            Login form              |
|    RegisterComponent         Registration form       |
|    RegisterSuccessComponent                          |
|    AuthService               Token management        |
|    authenticationInterceptor JWT attachment          |
|                                                      |
|  recipe/ (planned)                                   |
|    RecipeListComponent       Search & filter         |
|    RecipeDetailComponent     Cooking view            |
|    RecipeEditComponent       Add/edit recipe         |
|    RecipeService             API communication       |
|                                                      |
|  favorite/ (planned)                                 |
|    FavoriteService           Favorite toggling       |
|                                                      |
|  meal-plan/ (planned)                                |
|    MealPlanComponent         Weekly plan view        |
|    MealSlotConfigComponent   Slot configuration      |
|    MealPlanService           API communication       |
|    SuggestionService         Suggestion handling     |
|                                                      |
|  admin/ (planned)                                    |
|    AdminShellComponent       Admin area layout/nav   |
|    AdminUserListComponent    List & edit users       |
|    AdminRecipeListComponent  List & edit recipes     |
|    AdminIngredientListCmp    List & edit ingredients |
|    AdminGuard                Restricts area to ADMIN |
|    AdminService              API communication       |
|                                                      |
|  utility/                                            |
|    LocalStorageService       Browser storage         |
+------------------------------------------------------+
```
