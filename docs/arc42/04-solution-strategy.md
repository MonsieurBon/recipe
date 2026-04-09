# 4. Solution Strategy

| Goal | Approach |
|---|---|
| Simplicity | Monolithic architecture -- single Spring Boot JAR serves both API and frontend |
| Usability | Angular Material for a responsive, mobile-friendly UI |
| Reliability | MySQL for durable storage; Flyway for repeatable schema migrations |
| Stateless scaling | JWT-based authentication; no server-side sessions |
| Developer productivity | TDD workflow; automated formatting (Spotless, Prettier); integrated frontend build via Maven |
