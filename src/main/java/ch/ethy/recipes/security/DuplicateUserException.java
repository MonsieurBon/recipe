package ch.ethy.recipes.security;

import java.util.List;

public class DuplicateUserException extends RuntimeException {
  private final List<String> conflictingFields;

  public DuplicateUserException(List<String> conflictingFields) {
    super("Duplicate user: " + String.join(", ", conflictingFields));
    this.conflictingFields = conflictingFields;
  }

  public List<String> getConflictingFields() {
    return conflictingFields;
  }
}
