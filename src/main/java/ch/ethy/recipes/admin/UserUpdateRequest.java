package ch.ethy.recipes.admin;

import ch.ethy.recipes.user.Role;
import jakarta.validation.constraints.NotNull;

/**
 * Admin request body for changing a single user. Both fields are required so an omitted one is a
 * 400 rather than a silent default — the client always submits the user's full editable state, and
 * the server compares it against what is stored to decide what actually changed.
 *
 * <p>{@code role} is the single role the admin picks, not the stored set: {@link Role#ADMIN} means
 * admin, {@link Role#USER} means an ordinary account. The base {@code USER} role every account
 * carries is implied, so a client cannot construct an account that lacks it.
 */
public record UserUpdateRequest(@NotNull Boolean enabled, @NotNull Role role) {}
