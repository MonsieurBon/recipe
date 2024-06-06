/* (C)2024 */
package ch.ethy.recipe;

import ch.ethy.recipe.database.connection.ConnectionPool;
import ch.ethy.recipe.database.connection.MySQLConnectionPool;
import java.sql.SQLException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RecipeConfiguration {
  @Bean
  public ConnectionPool connectionPool(
      @Value("${database.host}") String host,
      @Value("${database.port}") int port,
      @Value("${database.user}") String user,
      @Value("${database.password}") String password)
      throws ClassNotFoundException, SQLException, InterruptedException {
    ConnectionPool connectionPool = new MySQLConnectionPool(host, port, user, password);
    while (!connectionPool.checkConnectivity()) {
      //noinspection BusyWait
      Thread.sleep(1000);
    }
    connectionPool.fillPool();
    return connectionPool;
  }
}
