package ch.ethy.recipes.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.ethy.recipes.security.TokenVersionService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class UserServiceTest {

  private TokenVersionService tokenVersionService;
  private UserRepository userRepository;
  private UserService userService;

  @BeforeEach
  void setUp() {
    tokenVersionService = mock(TokenVersionService.class);
    userRepository = mock(UserRepository.class);
    userService = new UserService(tokenVersionService, userRepository);
  }

  @Test
  void rolesAreReturnedInDeclarationOrder() {
    User admin = new User();
    admin.setUsername("alice");
    admin.setEmail("alice@example.com");
    admin.addRole(Role.ADMIN);
    when(userRepository.findAll()).thenReturn(List.of(admin));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals(List.of(Role.USER, Role.ADMIN), List.copyOf(dto.roles()));
  }

  @Test
  void rolesAreDetachedFromLaterEntityChanges() {
    User user = new User();
    user.setUsername("bob");
    user.setEmail("bob@example.com");
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();
    user.addRole(Role.ADMIN);

    assertEquals(List.of(Role.USER), List.copyOf(dto.roles()));
  }

  @Test
  void preferredLanguageIsReturnedAsItsWireCode() {
    User user = new User();
    user.setUsername("carol");
    user.setEmail("carol@example.com");
    user.setPreferredLanguage(Language.FRENCH);
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals("fr", dto.preferredLanguage());
  }

  private ArgumentCaptor<Pageable> stubSearch(User... users) {
    ArgumentCaptor<Pageable> applied = ArgumentCaptor.forClass(Pageable.class);
    when(userRepository.search(any(), anyBoolean(), applied.capture()))
        .thenReturn(new PageImpl<>(List.of(users), PageRequest.of(1, 10), 25));
    return applied;
  }

  @Test
  void searchUsersDefaultsToAStableIdSortAndPreservesPagingMetadata() {
    User user = new User();
    user.setUsername("alice");
    user.setEmail("alice@example.com");
    ArgumentCaptor<Pageable> applied = stubSearch(user);

    Page<UserDto> page = userService.searchUsers(PageRequest.of(1, 10), null, false);

    assertEquals(Sort.by("id"), applied.getValue().getSort());
    assertEquals(1, applied.getValue().getPageNumber());
    assertEquals(10, applied.getValue().getPageSize());
    assertEquals(25, page.getTotalElements());
    assertEquals(List.of("alice"), page.getContent().stream().map(UserDto::username).toList());
  }

  @Test
  void searchUsersKeepsAnAllowedSortKeyAndAppendsIdAsATiebreaker() {
    ArgumentCaptor<Pageable> applied = stubSearch();

    userService.searchUsers(PageRequest.of(0, 10, Sort.by(Sort.Order.desc("email"))), null, false);
    assertEquals(
        Sort.by(Sort.Order.desc("email")).and(Sort.by("id")), applied.getValue().getSort());

    userService.searchUsers(
        PageRequest.of(0, 10, Sort.by(Sort.Order.asc("username"))), null, false);
    assertEquals(
        Sort.by(Sort.Order.asc("username")).and(Sort.by("id")), applied.getValue().getSort());

    userService.searchUsers(PageRequest.of(0, 10, Sort.by(Sort.Order.asc("enabled"))), null, false);
    assertEquals(
        Sort.by(Sort.Order.asc("enabled")).and(Sort.by("id")), applied.getValue().getSort());
  }

  @Test
  void searchUsersFallsBackToIdForADisallowedSortKey() {
    ArgumentCaptor<Pageable> applied = stubSearch();

    userService.searchUsers(PageRequest.of(0, 10, Sort.by("password")), null, false);

    assertEquals(Sort.by("id"), applied.getValue().getSort());
  }

  @Test
  void searchUsersNormalizesABlankSearchTermToNoFilter() {
    ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
    when(userRepository.search(query.capture(), anyBoolean(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    userService.searchUsers(PageRequest.of(0, 10), "   ", false);

    assertEquals(null, query.getValue());
  }

  @Test
  void searchUsersWrapsTheSearchTermInCaseInsensitiveWildcards() {
    ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
    when(userRepository.search(query.capture(), anyBoolean(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    userService.searchUsers(PageRequest.of(0, 10), " Ali ", false);

    assertEquals("%ali%", query.getValue());
  }

  @Test
  void searchUsersEscapesLikeWildcardsSoTheyMatchLiterally() {
    ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
    when(userRepository.search(query.capture(), anyBoolean(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    userService.searchUsers(PageRequest.of(0, 10), "a_b%c\\d", false);

    assertEquals("%a\\_b\\%c\\\\d%", query.getValue());
  }

  @Test
  void searchUsersPassesTheAdminsOnlyFilterThrough() {
    ArgumentCaptor<Boolean> adminsOnly = ArgumentCaptor.forClass(Boolean.class);
    when(userRepository.search(any(), adminsOnly.capture(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    userService.searchUsers(PageRequest.of(0, 10), null, true);

    assertEquals(true, adminsOnly.getValue());
  }

  @Test
  void updatePreferredLanguageResolvesTheCallerByIdAndSaves() {
    User user = new User();
    user.setUsername("alice");
    user.setEmail("alice@example.com");
    when(userRepository.findById(7L)).thenReturn(Optional.of(user));

    userService.updatePreferredLanguage(7L, Language.FRENCH);

    assertEquals(Language.FRENCH, user.getPreferredLanguage());
    verify(userRepository).save(user);
  }

  @Test
  void preferredLanguageDefaultsToGermanForANewUser() {
    User user = new User();
    user.setUsername("dave");
    user.setEmail("dave@example.com");
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertEquals("de", dto.preferredLanguage());
  }

  @Test
  void newUsersAreEnabledByDefault() {
    User user = new User();
    user.setUsername("erin");
    user.setEmail("erin@example.com");
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertTrue(dto.enabled());
  }

  @Test
  void disabledUsersAreReportedAsNotEnabled() {
    User user = new User();
    user.setUsername("frank");
    user.setEmail("frank@example.com");
    user.setEnabled(false);
    when(userRepository.findAll()).thenReturn(List.of(user));

    UserDto dto = userService.getAllUsers().getFirst();

    assertFalse(dto.enabled());
  }

  private static User user(long id, String username, boolean enabled, Role... roles) {
    User user = new User();
    user.setId(id);
    user.setUsername(username);
    user.setEmail(username + "@example.com");
    user.setEnabled(enabled);
    for (Role role : roles) {
      user.addRole(role);
    }
    return user;
  }

  @Test
  void disablingANonAdminPersistsWithoutTouchingTheAdminGuard() {
    User bob = user(2L, "bob", true, Role.USER);
    when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

    UserDto dto = userService.updateEnabled(2L, false, 1L);

    assertFalse(dto.enabled());
    assertFalse(bob.isEnabled());
    verify(userRepository).save(bob);
    verify(userRepository, never()).findActiveAdminsForUpdate();
  }

  @Test
  void disablingAnAdminIsAllowedWhileAnotherActiveAdminRemains() {
    User alice = user(1L, "alice", true, Role.USER, Role.ADMIN);
    User carol = user(3L, "carol", true, Role.USER, Role.ADMIN);
    when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
    when(userRepository.findActiveAdminsForUpdate()).thenReturn(List.of(alice, carol));

    UserDto dto = userService.updateEnabled(1L, false, 99L);

    assertFalse(dto.enabled());
    verify(userRepository).save(alice);
  }

  @Test
  void disablingTheLastActiveAdminIsRefused() {
    User alice = user(1L, "alice", true, Role.USER, Role.ADMIN);
    when(userRepository.findById(1L)).thenReturn(Optional.of(alice));
    when(userRepository.findActiveAdminsForUpdate()).thenReturn(List.of(alice));

    assertThrows(LastActiveAdminException.class, () -> userService.updateEnabled(1L, false, 99L));

    assertTrue(alice.isEnabled());
    verify(userRepository, never()).save(any());
  }

  @Test
  void disablingAUserRevokesTheirOutstandingTokens() {
    User bob = user(2L, "bob", true, Role.USER);
    when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

    userService.updateEnabled(2L, false, 1L);

    verify(tokenVersionService).revokeTokens(2L);
  }

  @Test
  void enablingAUserDoesNotRevokeTokens() {
    User bob = user(2L, "bob", false, Role.USER);
    when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

    userService.updateEnabled(2L, true, 1L);

    verify(tokenVersionService, never()).revokeTokens(anyLong());
  }

  @Test
  void anAdminCannotDisableTheirOwnAccount() {
    User alice = user(1L, "alice", true, Role.USER, Role.ADMIN);
    when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

    assertThrows(SelfDeactivationException.class, () -> userService.updateEnabled(1L, false, 1L));

    assertTrue(alice.isEnabled());
    verify(userRepository, never()).findActiveAdminsForUpdate();
    verify(userRepository, never()).save(any());
  }

  @Test
  void enablingIsAllowedEvenForTheOnlyAdminAndSkipsTheGuard() {
    User alice = user(1L, "alice", false, Role.USER, Role.ADMIN);
    when(userRepository.findById(1L)).thenReturn(Optional.of(alice));

    UserDto dto = userService.updateEnabled(1L, true, 99L);

    assertTrue(dto.enabled());
    verify(userRepository).save(alice);
    verify(userRepository, never()).findActiveAdminsForUpdate();
  }

  @Test
  void updatingAMissingUserThrowsNotFound() {
    when(userRepository.findById(404L)).thenReturn(Optional.empty());

    assertThrows(UserNotFoundException.class, () -> userService.updateEnabled(404L, false, 1L));

    verify(userRepository, never()).save(any());
  }

  @Test
  void settingTheValueItAlreadyHasIsANoOpSuccess() {
    User bob = user(2L, "bob", true, Role.USER);
    when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

    UserDto dto = userService.updateEnabled(2L, true, 1L);

    assertTrue(dto.enabled());
    verify(userRepository, never()).save(any());
    verify(userRepository, never()).findActiveAdminsForUpdate();
  }
}
