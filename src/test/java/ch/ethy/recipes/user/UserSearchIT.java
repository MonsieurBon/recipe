package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ch.ethy.recipes.security.TokenVersionService;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * Exercises the user search against a real MySQL: the case-insensitive {@code LIKE} term, the
 * admins-only {@code JSON_CONTAINS} filter and the allow-listed sort — none of which the
 * mocked-repository unit tests can cover, since they hinge on the native query and MySQL applying
 * the appended {@code ORDER BY}.
 *
 * <p>The container setup mirrors {@link UserEnabledGuardIT}: the full migration chain runs (V1
 * needs elevated privileges granted by a root init script) and the Flyway/DB password placeholders
 * are stubbed so startup resolves without those environment variables.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Import({UserService.class, TokenVersionService.class})
@TestPropertySource(
    properties = {
      "spring.jpa.hibernate.ddl-auto=validate",
      "FLYWAY_PASSWORD=unused",
      "DB_PASSWORD=unused",
    })
class UserSearchIT {

  @Container @ServiceConnection
  static MySQLContainer mysql =
      new MySQLContainer("mysql:8.4")
          .withCopyFileToContainer(
              MountableFile.forClasspathResource("db/it-mysql-init.sql"),
              "/docker-entrypoint-initdb.d/it-mysql-init.sql");

  @Autowired private UserRepository userRepository;
  @Autowired private UserService userService;

  private void save(String username, String email, boolean enabled, Role... roles) {
    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword("irrelevant");
    user.setEnabled(enabled);
    for (Role role : roles) {
      user.addRole(role);
    }
    userRepository.save(user);
  }

  private List<String> usernames(Page<UserDto> page) {
    return page.getContent().stream().map(UserDto::username).toList();
  }

  @Test
  void searchMatchesUsernameCaseInsensitivelyAsASubstring() {
    save("alice", "alice@example.com", true, Role.USER);
    save("bob", "bob@example.com", true, Role.USER);

    Page<UserDto> page = userService.searchUsers(PageRequest.of(0, 10), "ALI", false);

    assertEquals(List.of("alice"), usernames(page));
  }

  @Test
  void searchAlsoMatchesTheEmail() {
    save("alice", "alice@example.com", true, Role.USER);
    save("bob", "contact@bob.test", true, Role.USER);

    Page<UserDto> page = userService.searchUsers(PageRequest.of(0, 10), "bob.test", false);

    assertEquals(List.of("bob"), usernames(page));
  }

  @Test
  void aBlankTermReturnsEveryUser() {
    save("alice", "alice@example.com", true, Role.USER);
    save("bob", "bob@example.com", true, Role.USER);

    Page<UserDto> page = userService.searchUsers(PageRequest.of(0, 10), "  ", false);

    assertEquals(2, page.getTotalElements());
  }

  @Test
  void adminsOnlyFilterReturnsOnlyAccountsHoldingTheAdminRole() {
    save("alice", "alice@example.com", true, Role.USER, Role.ADMIN);
    save("bob", "bob@example.com", true, Role.USER);
    save("carol", "carol@example.com", false, Role.USER, Role.ADMIN);

    Page<UserDto> page =
        userService.searchUsers(PageRequest.of(0, 10, Sort.by("username")), null, true);

    assertEquals(List.of("alice", "carol"), usernames(page));
  }

  @Test
  void theSearchTermAndTheAdminsFilterCombine() {
    save("alice", "alice@example.com", true, Role.USER, Role.ADMIN);
    save("albert", "albert@example.com", true, Role.USER);

    Page<UserDto> page = userService.searchUsers(PageRequest.of(0, 10), "al", true);

    assertEquals(List.of("alice"), usernames(page));
  }

  @Test
  void sortsByUsernameInBothDirections() {
    save("carol", "carol@example.com", true, Role.USER);
    save("alice", "alice@example.com", true, Role.USER);
    save("bob", "bob@example.com", true, Role.USER);

    Page<UserDto> ascending =
        userService.searchUsers(
            PageRequest.of(0, 10, Sort.by(Sort.Order.asc("username"))), null, false);
    Page<UserDto> descending =
        userService.searchUsers(
            PageRequest.of(0, 10, Sort.by(Sort.Order.desc("username"))), null, false);

    assertEquals(List.of("alice", "bob", "carol"), usernames(ascending));
    assertEquals(List.of("carol", "bob", "alice"), usernames(descending));
  }

  @Test
  void sortsByTheEnabledColumn() {
    save("alice", "alice@example.com", false, Role.USER);
    save("bob", "bob@example.com", true, Role.USER);

    Page<UserDto> page =
        userService.searchUsers(
            PageRequest.of(0, 10, Sort.by(Sort.Order.desc("enabled"))), null, false);

    assertEquals(List.of("bob", "alice"), usernames(page));
  }

  @Test
  void pagingAnEnabledSortedSetIsStableAcrossPages() {
    // More rows than one page share only two distinct enabled values, so without the id tiebreaker
    // rows could repeat or be skipped between pages.
    for (int i = 0; i < 12; i++) {
      save("paged-" + i, "paged-" + i + "@example.com", i % 2 == 0, Role.USER);
    }
    Sort byEnabled = Sort.by(Sort.Order.desc("enabled"));

    List<String> paged = new ArrayList<>();
    paged.addAll(usernames(userService.searchUsers(PageRequest.of(0, 5, byEnabled), null, false)));
    paged.addAll(usernames(userService.searchUsers(PageRequest.of(1, 5, byEnabled), null, false)));
    paged.addAll(usernames(userService.searchUsers(PageRequest.of(2, 5, byEnabled), null, false)));

    // Every user appears exactly once across the pages: no duplicate, none skipped.
    assertEquals(12, paged.size());
    assertEquals(12, Set.copyOf(paged).size());
  }

  @Test
  void searchTreatsLikeWildcardsInTheTermAsLiterals() {
    save("ab_cd", "ab_cd@example.com", true, Role.USER);
    save("abxcd", "abxcd@example.com", true, Role.USER);

    // The underscore is a literal, so it must not match the arbitrary character in "abxcd".
    Page<UserDto> page = userService.searchUsers(PageRequest.of(0, 10), "ab_cd", false);

    assertEquals(List.of("ab_cd"), usernames(page));
  }
}
