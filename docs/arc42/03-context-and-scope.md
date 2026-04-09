# 3. Context and Scope

## 3.1 Business Context

```
+--------+       HTTPS        +---------------------+
|        | ------------------> |                     |
|  User  |                     |  Recipe & Meal      |
|        | <------------------ |  Planner            |
+--------+    HTML/JSON        +---------------------+
                                       |
                                       | JDBC
                                       v
                                +-------------+
                                |   MySQL     |
                                +-------------+
```

| Neighbor | Description |
|---|---|
| User | Interacts with the application via a web browser |
| MySQL | Stores all persistent data: users, recipes, favorites, meal plans |

The system has no external service dependencies (no third-party APIs).

## 3.2 Technical Context

```
+--------+       HTTPS        +-----------------------------------+
|        | ------------------> |  Spring Boot Application          |
|  Web   |    /api/**          |  +-----------------------------+  |
| Browser|                     |  |  REST Controllers           |  |
|        | <-- JSON ---------- |  +-----------------------------+  |
|        |                     |  |  Service Layer              |  |
|        | ------------------> |  +-----------------------------+  |
|        |    /*               |  |  JPA Repositories           |  |
|        | <-- static files -- |  +-----------------------------+  |
+--------+                     +-----------------------------------+
                                       |
                                       | JDBC (port 3306)
                                       v
                                +-------------+
                                |   MySQL     |
                                +-------------+
```

| Channel | Technology |
|---|---|
| Browser to Backend (API) | HTTPS, REST/JSON, JWT Bearer tokens |
| Browser to Backend (UI) | HTTPS, static files (HTML, JS, CSS) |
| Backend to Database | JDBC via HikariCP connection pool |
