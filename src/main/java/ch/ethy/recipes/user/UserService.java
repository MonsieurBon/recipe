package ch.ethy.recipes.user;

import ch.ethy.recipes.security.TokenVersionService;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class UserService {
  // Columns a client may sort by, named exactly as the response fields. Only these reach the
  // query; any other key falls back to the immutable id sort, so the sort parameter can never
  // order by — and thereby leak the ordering of — a sensitive column such as password.
  private static final Set<String> SORTABLE_COLUMNS = Set.of("username", "email", "enabled");
  private static final Sort DEFAULT_SORT = Sort.by("id");

  private final TokenVersionService tokenVersionService;
  private final UserRepository userRepository;

  public UserService(TokenVersionService tokenVersionService, UserRepository userRepository) {
    this.tokenVersionService = tokenVersionService;
    this.userRepository = userRepository;
  }

  public List<UserDto> getAllUsers() {
    return userRepository.findAll().stream().map(UserService::toDto).toList();
  }

  /**
   * Lists users for the admin overview, optionally narrowed by a free-text term and an admins-only
   * filter, and ordered by an allow-listed sort key. The requested sort is reduced to known-safe
   * columns before it reaches the query, so it can never become an ordering oracle over a sensitive
   * column; an empty or unknown sort defaults to the immutable id, keeping page boundaries stable.
   *
   * @param pageable the requested page, size and sort (sort keys are allow-listed)
   * @param query a free-text term matched against username and email, or blank for no filter
   * @param adminsOnly when true, restrict the result to accounts holding the admin role
   */
  public Page<UserDto> searchUsers(Pageable pageable, String query, boolean adminsOnly) {
    Pageable safe =
        PageRequest.of(
            pageable.getPageNumber(), pageable.getPageSize(), safeSort(pageable.getSort()));
    return userRepository.search(searchPattern(query), adminsOnly, safe).map(UserService::toDto);
  }

  private static Sort safeSort(Sort requested) {
    List<Sort.Order> allowed =
        requested.stream().filter(order -> SORTABLE_COLUMNS.contains(order.getProperty())).toList();
    // Append the immutable id as a final tiebreaker. A non-unique key such as enabled leaves rows
    // with equal values in an undefined order under LIMIT/OFFSET, which could repeat or skip a row
    // while paging; the id makes every ordering total, so pages stay consistent.
    return allowed.isEmpty() ? DEFAULT_SORT : Sort.by(allowed).and(DEFAULT_SORT);
  }

  private static String searchPattern(String query) {
    if (query == null || query.isBlank()) {
      return null;
    }
    // Escape the LIKE metacharacters so a literal % or _ in the term matches itself rather than
    // acting as a wildcard; the query pairs this with ESCAPE '\'. Backslash first, so the escapes
    // added for % and _ are not themselves re-escaped.
    String escaped =
        query
            .strip()
            .toLowerCase(Locale.ROOT)
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
    return "%" + escaped + "%";
  }

  public Optional<UserDto> findUser(long id) {
    return userRepository.findById(id).map(UserService::toDto);
  }

  /**
   * Applies an admin's changes to a user's enabled state and role, enforcing two rules that protect
   * access to administration. An admin may never deactivate or demote their own account (a footgun
   * with no use case). No change may leave zero active admins; that check locks the active-admin
   * rows so concurrent changes cannot both slip through. Granting access — enabling a user or
   * promoting them — can never violate either rule and skips the guard.
   *
   * <p>Both guards judge the transition, not the fields in isolation: they engage only when the
   * user is an active admin now and would not be afterwards, whether that comes from the enabled
   * flag, the role, or both changing at once.
   *
   * @param targetId the user to change
   * @param enabled the desired enabled state
   * @param role the desired role; {@link Role#ADMIN} implies the base {@link Role#USER} role
   * @param principalId the authenticated admin performing the change, resolved from the token
   * @return the updated user
   */
  @Transactional
  public UserDto updateUser(long targetId, boolean enabled, Role role, long principalId) {
    User user =
        userRepository.findById(targetId).orElseThrow(() -> new UserNotFoundException(targetId));
    Set<Role> roles = rolesFor(role);
    boolean enabledChanged = user.isEnabled() != enabled;
    boolean rolesChanged = !user.getRoles().equals(roles);
    if (!enabledChanged && !rolesChanged) {
      return toDto(user);
    }
    if (targetId == principalId) {
      if (enabledChanged && !enabled) {
        throw new SelfDeactivationException();
      }
      if (rolesChanged && !roles.contains(Role.ADMIN)) {
        throw new SelfDemotionException();
      }
    }
    // Only a user who counts as an active admin today can reduce the admin count by losing that
    // standing; a disabled admin is already outside the count, so dropping their role is harmless.
    boolean wasActiveAdmin = user.isEnabled() && user.getRoles().contains(Role.ADMIN);
    if (wasActiveAdmin && !(enabled && roles.contains(Role.ADMIN)) && isLastActiveAdmin(targetId)) {
      throw new LastActiveAdminException();
    }
    user.setEnabled(enabled);
    user.setRoles(roles);
    userRepository.save(user);
    if ((enabledChanged && !enabled) || rolesChanged) {
      // Withdrawing access is a hard revocation: bump the token version so outstanding access
      // tokens are rejected at once instead of carrying the old standing until they expire — a
      // demoted admin would otherwise keep wielding ADMIN for the rest of the token's life. A
      // promotion bumps too, so the new role reaches the user just as promptly. Refresh is refused
      // separately, on the refresh path.
      tokenVersionService.revokeTokens(targetId);
    }
    return toDto(user);
  }

  /**
   * Removes a user's account. An admin may not delete their own account, and no deletion may leave
   * zero active admins; that check locks the active-admin rows, so two admins deleting each other
   * at the same moment cannot both slip through.
   *
   * @param targetId the user to remove
   * @param principalId the authenticated admin performing the deletion, resolved from the token
   */
  @Transactional
  public void deleteUser(long targetId, long principalId) {
    if (targetId == principalId) {
      throw new SelfDeletionException();
    }
    User user =
        userRepository.findById(targetId).orElseThrow(() -> new UserNotFoundException(targetId));
    // Only an active admin can reduce the admin count by being removed; a disabled admin is already
    // outside the count, so deleting them is harmless.
    if (user.isEnabled() && user.getRoles().contains(Role.ADMIN) && isLastActiveAdmin(targetId)) {
      throw new LastActiveAdminException();
    }
    userRepository.delete(user);
    // Forget the cached token version only once the row is really gone. While the deletion is
    // uncommitted the row stays visible to concurrent readers, which would read the old version
    // straight back into the cache and keep the deleted account's access tokens valid for the rest
    // of the cache's lifetime.
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            tokenVersionService.forgetUser(targetId);
          }
        });
  }

  /**
   * Expands the single role an admin picks into the stored set; every account keeps {@code USER}.
   */
  private static Set<Role> rolesFor(Role role) {
    return role == Role.ADMIN ? EnumSet.of(Role.USER, Role.ADMIN) : EnumSet.of(Role.USER);
  }

  private boolean isLastActiveAdmin(long targetId) {
    return userRepository.findActiveAdminsForUpdate().stream()
        .noneMatch(admin -> admin.getId() != targetId);
  }

  /**
   * Stores a user's preferred UI language. The id comes from the authenticated principal (the
   * token's {@code uid} claim) — the stable, immutable key — and a valid token guarantees the user
   * exists; a missing row therefore signals corrupted state rather than bad input.
   */
  @Transactional
  public void updatePreferredLanguage(long userId, Language language) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(
                () -> new IllegalStateException("Authenticated user no longer exists: " + userId));
    user.setPreferredLanguage(language);
    userRepository.save(user);
  }

  private static UserDto toDto(User user) {
    // EnumSet iterates in declaration order, giving the roles a stable order everywhere they are
    // serialized; copying also detaches the DTO from the entity's mutable set.
    EnumSet<Role> roles = EnumSet.noneOf(Role.class);
    roles.addAll(user.getRoles());
    return new UserDto(
        user.getId(),
        user.getUsername(),
        user.getEmail(),
        user.isEnabled(),
        Collections.unmodifiableSet(roles),
        user.getPreferredLanguage().code());
  }
}
