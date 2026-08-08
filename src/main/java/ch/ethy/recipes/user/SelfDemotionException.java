package ch.ethy.recipes.user;

/**
 * Thrown when an admin tries to drop the admin role from their own account. Like self-deactivation,
 * it is a footgun with no use case and is refused server-side regardless of the client state.
 * Surfaces as a 409.
 */
public class SelfDemotionException extends RuntimeException {}
