package ch.ethy.recipes.admin;

import ch.ethy.recipes.security.AuthenticatedUser;
import ch.ethy.recipes.user.LastActiveAdminException;
import ch.ethy.recipes.user.SelfDeactivationException;
import ch.ethy.recipes.user.SelfDemotionException;
import ch.ethy.recipes.user.UserDto;
import ch.ethy.recipes.user.UserNotFoundException;
import ch.ethy.recipes.user.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
  private final UserService userService;

  public AdminUserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping
  public PagedModel<UserDto> searchUsers(
      @PageableDefault(size = 10) Pageable pageable,
      @RequestParam(name = "q", required = false) String query,
      @RequestParam(name = "admins", defaultValue = "false") boolean adminsOnly) {
    return new PagedModel<>(userService.searchUsers(pageable, query, adminsOnly));
  }

  /**
   * Changes a single user. The actor is the authenticated principal (resolved from the token by
   * immutable id), never the request body, so the self-modification guard cannot be bypassed.
   */
  @PutMapping("/{id}")
  public UserDto updateUser(
      @PathVariable long id,
      @RequestBody @Valid UserUpdateRequest request,
      @AuthenticationPrincipal AuthenticatedUser principal) {
    return userService.updateUser(id, request.enabled(), request.role(), principal.getUserId());
  }

  @ExceptionHandler(UserNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public void handleUserNotFound() {}

  @ExceptionHandler(SelfDeactivationException.class)
  public ResponseEntity<ErrorReason> handleSelfDeactivation() {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorReason("selfDeactivation"));
  }

  @ExceptionHandler(SelfDemotionException.class)
  public ResponseEntity<ErrorReason> handleSelfDemotion() {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorReason("selfDemotion"));
  }

  @ExceptionHandler(LastActiveAdminException.class)
  public ResponseEntity<ErrorReason> handleLastActiveAdmin() {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorReason("lastActiveAdmin"));
  }

  /** Machine-readable cause the client maps to a localized message on a rejected admin change. */
  public record ErrorReason(String reason) {}
}
