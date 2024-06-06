/* (C)2024 */
package ch.ethy.recipe.database.connection;

import java.sql.Connection;
import java.sql.SQLException;

public interface ConnectionPool {
  boolean checkConnectivity();

  Connection getConnection() throws SQLException;

  void releaseConnection(Connection connection);

  int getSize();

  void fillPool() throws SQLException;
}
