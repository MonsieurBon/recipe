package ch.ethy.recipes.user;

/**
 * Thrown when an admin tries to delete their own account. Deleting yourself is irreversible and has
 * no use case in the admin area; it is refused server-side regardless of the client state. Surfaces
 * as a 409.
 */
public class SelfDeletionException extends RuntimeException {}
