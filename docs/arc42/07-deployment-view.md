# 7. Deployment View

```
+----------------------------------------------------+
|  Host Machine                                      |
|                                                    |
|  +-------------------+     +-------------------+   |
|  |  Docker: App      |     |  Docker: MySQL    |   |
|  |  (Spring Boot JAR)|---->|  (Port 3306)      |   |
|  |  Port 8080        |     |                   |   |
|  +-------------------+     +-------------------+   |
|         ^                                          |
+---------|------------------------------------------+
          | HTTPS (reverse proxy)
     +---------+
     |  User   |
     +---------+
```

The application is packaged as a single Docker image containing the Spring Boot fat JAR (with the Angular build embedded as static resources). It connects to a MySQL instance.
