/* (C)2024 */
package ch.ethy.recipe.database.migrations;

import java.sql.Connection;
import java.sql.SQLException;

public interface Migration {
  void migrate(Connection connection) throws SQLException;

  void rollback(Connection connection) throws SQLException;
}
