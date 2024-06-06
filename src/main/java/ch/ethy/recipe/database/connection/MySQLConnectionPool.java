/* (C)2024 */
package ch.ethy.recipe.database.connection;

import jakarta.annotation.PreDestroy;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MySQLConnectionPool implements ConnectionPool {
  private static final int INITIAL_POOL_SIZE = 10;
  private static final int MAX_POOL_SIZE = 100;
  private static final int MAX_TIMEOUT = 1;
  private static final Logger LOGGER = LoggerFactory.getLogger(MySQLConnectionPool.class);

  private final String host;
  private final int port;
  private final String database;
  private final String username;
  private final String password;

  private final List<Connection> pool = new ArrayList<>(INITIAL_POOL_SIZE);
  private final List<Connection> usedConnections = new ArrayList<>();

  public MySQLConnectionPool(String host, int port, String username, String password)
      throws ClassNotFoundException {
    Class.forName("com.mysql.cj.jdbc.Driver");
    this.host = host;
    this.port = port;
    this.database = username;
    this.username = username;
    this.password = password;
  }

  @Override
  public boolean checkConnectivity() {
    try (Connection ignored = createConnection()) {
      return true;
    } catch (SQLException e) {
      LOGGER.warn("Connection failed. Database not ready yet.", e);
      return false;
    }
  }

  @Override
  public Connection getConnection() throws SQLException {
    synchronized (this) {
      if (pool.isEmpty()) {
        if (usedConnections.size() < MAX_POOL_SIZE) {
          pool.add(createConnection());
        }
      }

      Connection connection = pool.removeFirst();

      if (!connection.isValid(MAX_TIMEOUT)) {
        connection = createConnection();
      }

      usedConnections.add(connection);
      return connection;
    }
  }

  @Override
  public void releaseConnection(Connection connection) {
    synchronized (this) {
      pool.add(connection);
      usedConnections.remove(connection);
    }
  }

  @Override
  public int getSize() {
    return pool.size() + usedConnections.size();
  }

  @Override
  public void fillPool() throws SQLException {
    synchronized (this) {
      while (getSize() < INITIAL_POOL_SIZE) {
        pool.add(createConnection());
      }
    }
  }

  @PreDestroy
  public void shutdown() throws SQLException {
    synchronized (this) {
      while (!usedConnections.isEmpty()) {
        releaseConnection(usedConnections.getFirst());
      }
      for (Connection connection : pool) {
        connection.close();
      }
      pool.clear();
    }
  }

  private Connection createConnection() throws SQLException {
    String url = "jdbc:mysql://" + host + ":" + port + "/" + database + "?serverTimezone=UTC";
    return DriverManager.getConnection(url, username, password);
  }
}
