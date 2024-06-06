/* (C)2024 */
package ch.ethy.recipe.database;

import ch.ethy.recipe.database.connection.ConnectionPool;
import ch.ethy.recipe.database.migrations.Migration;
import ch.ethy.recipe.tools.Pair;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.InvocationTargetException;
import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class DatabaseMigrator {
  private static final Logger LOGGER = LoggerFactory.getLogger(DatabaseMigrator.class);

  private final ConfigurableApplicationContext applicationContext;
  private final ConnectionPool connectionPool;

  public DatabaseMigrator(
      ConfigurableApplicationContext applicationContext, ConnectionPool connectionPool) {
    this.applicationContext = applicationContext;
    this.connectionPool = connectionPool;
  }

  @EventListener(ContextRefreshedEvent.class)
  public void migrateDatabase() {
    try {
      Connection connection = this.connectionPool.getConnection();
      createMigrationsTable(connection);
      migrate(connection);
    } catch (Exception e) {
      LOGGER.error("Failed to migrate database", e);
      applicationContext.close();
    }
  }

  private void createMigrationsTable(Connection connection) throws SQLException {
    String createMigrationsTable =
        "CREATE TABLE IF NOT EXISTS MIGRATIONS (name varchar(255), migrated_at timestamp)";

    try (Statement statement = connection.createStatement(); ) {
      statement.executeUpdate(createMigrationsTable);
    } catch (SQLException e) {
      LOGGER.error("Failed to create migrations table");
      throw e;
    }
  }

  private void migrate(Connection connection) throws SQLException {
    List<String> migrationsDone = getMigrationsDone(connection);
    List<Pair<String, Migration>> migrations = findMigrationsToDo(migrationsDone);

    String insertMigration = "INSERT INTO MIGRATIONS (name, migrated_at) VALUES (?, ?)";
    try (PreparedStatement ps = connection.prepareStatement(insertMigration)) {
      for (Pair<String, Migration> migration : migrations) {
        try {
          migration.second.migrate(connection);

          ps.clearParameters();
          ps.setString(1, migration.first);
          ps.setTimestamp(2, Timestamp.from(Instant.now()));
          ps.executeUpdate();
        } catch (Exception e) {
          migration.second.rollback(connection);
          throw e;
        }
      }
    }
  }

  private List<String> getMigrationsDone(Connection connection) throws SQLException {
    String selectMigratedMigrations = "SELECT name FROM MIGRATIONS";
    List<String> migrationsDone = new ArrayList<>();
    try (Statement ps = connection.createStatement();
        ResultSet rs = ps.executeQuery(selectMigratedMigrations)) {
      while (rs.next()) {
        migrationsDone.add(rs.getString("name"));
      }
    }
    return migrationsDone;
  }

  private List<Pair<String, Migration>> findMigrationsToDo(List<String> migrationsDone) {
    String packageName = "ch.ethy.recipe.database.migrations";

    List<Pair<String, Migration>> migrations = List.of();
    try (InputStream stream =
            ClassLoader.getSystemClassLoader()
                .getResourceAsStream(packageName.replaceAll("[.]", "/"));
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
      migrations =
          reader
              .lines()
              .filter(line -> line.endsWith(".class"))
              .map(line -> line.substring(0, line.lastIndexOf('.')))
              .filter(className -> !"Migration".equals(className))
              .filter(className -> !migrationsDone.contains(className))
              .sorted()
              .map(className -> new Pair<>(className, getClass(className, packageName)))
              .filter(pair -> Objects.nonNull(pair.second))
              .toList();
      return migrations;
    } catch (IOException e) {
      LOGGER.warn("Failed to close input stream", e);
      return migrations;
    }
  }

  private Migration getClass(String className, String packageName) {
    Class<?> aClass = null;
    try {
      aClass = Class.forName(packageName + "." + className);
      Object o = aClass.getDeclaredConstructor().newInstance();
      return o instanceof Migration migration ? migration : null;
    } catch (ClassNotFoundException e) {
      return null;
    } catch (InvocationTargetException
        | InstantiationException
        | IllegalAccessException
        | NoSuchMethodException e) {
      throw new MigrationException(
          "No public no-args constructor defined for migration " + aClass, e);
    }
  }

  private static class MigrationException extends RuntimeException {
    public MigrationException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
