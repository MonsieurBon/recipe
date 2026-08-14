package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.ethy.recipes.security.TokenVersionService;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Pins the race the last-active-admin guard exists for: two admins losing their standing at the
 * same moment — by demotion, deactivation or deletion — each in its own transaction. A plain
 * read-count-then-write check passes both, since both read a count of two before either commits,
 * and leaves the system with zero admins, locking everyone out of administration. The guard's
 * locking read must serialize the two so exactly one wins.
 *
 * <p>Unlike the other integration tests this one must <em>not</em> run inside a test-managed
 * transaction: the competing threads need to see committed state and take real row locks, which a
 * single shared rollback-only transaction would hide. Hence {@code NOT_SUPPORTED} and the explicit
 * cleanup.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Import({UserService.class, TokenVersionService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@TestPropertySource(
    properties = {
      "spring.jpa.hibernate.ddl-auto=validate",
      "FLYWAY_PASSWORD=unused",
      "DB_PASSWORD=unused",
    })
class LastActiveAdminConcurrencyIT {

  private static final long OTHER_ACTOR = 999L;

  @Container @ServiceConnection
  static MySQLContainer mysql =
      new MySQLContainer("mysql:8.4")
          .withCopyFileToContainer(
              MountableFile.forClasspathResource("db/it-mysql-init.sql"),
              "/docker-entrypoint-initdb.d/it-mysql-init.sql");

  @Autowired private UserRepository userRepository;
  @Autowired private UserService userService;

  @AfterEach
  void clearUsers() {
    userRepository.deleteAll();
  }

  private User saveAdmin(String username) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setPassword("irrelevant");
    user.addRole(Role.ADMIN);
    return userRepository.save(user);
  }

  /**
   * Runs both changes from a common start signal so their transactions genuinely overlap. Each task
   * is submitted before the gate opens, so neither can finish ahead of the other starting.
   */
  private List<Throwable> runConcurrently(Runnable first, Runnable second) throws Exception {
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    try {
      Future<Throwable> firstResult = pool.submit(awaiting(start, first));
      Future<Throwable> secondResult = pool.submit(awaiting(start, second));
      start.countDown();
      List<Throwable> outcomes = new ArrayList<>();
      for (Future<Throwable> result : List.of(firstResult, secondResult)) {
        outcomes.add(result.get(30, TimeUnit.SECONDS));
      }
      return outcomes;
    } finally {
      pool.shutdownNow();
    }
  }

  private static Callable<Throwable> awaiting(CountDownLatch start, Runnable action) {
    return () -> {
      start.await();
      try {
        action.run();
        return null;
      } catch (Throwable failure) {
        return failure;
      }
    };
  }

  @Test
  void concurrentDemotionsOfTheLastTwoAdminsLeaveExactlyOneAdmin() throws Exception {
    User first = saveAdmin("first-admin");
    User second = saveAdmin("second-admin");

    List<Throwable> outcomes =
        runConcurrently(
            () -> userService.updateUser(first.getId(), true, Role.USER, OTHER_ACTOR),
            () -> userService.updateUser(second.getId(), true, Role.USER, OTHER_ACTOR));

    assertOneRefusedAndOneAdminRemains(outcomes);
  }

  @Test
  void aConcurrentDemotionAndDeactivationOfTheLastTwoAdminsLeaveExactlyOneAdmin() throws Exception {
    User first = saveAdmin("first-admin");
    User second = saveAdmin("second-admin");

    // The two routes out of the active-admin set must serialize against each other too, not just
    // against their own kind.
    List<Throwable> outcomes =
        runConcurrently(
            () -> userService.updateUser(first.getId(), true, Role.USER, OTHER_ACTOR),
            () -> userService.updateUser(second.getId(), false, Role.ADMIN, OTHER_ACTOR));

    assertOneRefusedAndOneAdminRemains(outcomes);
  }

  @Test
  void concurrentDeletionsOfTheLastTwoAdminsLeaveExactlyOneAdmin() throws Exception {
    User first = saveAdmin("first-admin");
    User second = saveAdmin("second-admin");

    // Neither admin is removing their own account, so the self-deletion guard never engages here.
    // Only the locking read stops the two from wiping out administration between them.
    List<Throwable> outcomes =
        runConcurrently(
            () -> userService.deleteUser(first.getId(), second.getId()),
            () -> userService.deleteUser(second.getId(), first.getId()));

    assertOneRefusedAndOneAdminRemains(outcomes);
  }

  @Test
  void aConcurrentDeletionAndDemotionOfTheLastTwoAdminsLeaveExactlyOneAdmin() throws Exception {
    User first = saveAdmin("first-admin");
    User second = saveAdmin("second-admin");

    List<Throwable> outcomes =
        runConcurrently(
            () -> userService.deleteUser(first.getId(), OTHER_ACTOR),
            () -> userService.updateUser(second.getId(), true, Role.USER, OTHER_ACTOR));

    assertOneRefusedAndOneAdminRemains(outcomes);
  }

  private void assertOneRefusedAndOneAdminRemains(List<Throwable> outcomes) {
    List<Throwable> refusals = outcomes.stream().filter(Objects::nonNull).toList();
    assertEquals(
        1,
        refusals.size(),
        "exactly one of the two concurrent changes must be refused, got outcomes: " + outcomes);
    assertInstanceOf(LastActiveAdminException.class, refusals.getFirst());

    List<User> remaining = userRepository.findActiveAdminsForUpdate();
    assertEquals(1, remaining.size(), "exactly one active admin must survive");
    assertTrue(remaining.getFirst().isEnabled());
    assertTrue(remaining.getFirst().getRoles().contains(Role.ADMIN));
  }
}
