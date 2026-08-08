package ch.ethy.recipes.user;

/**
 * Thrown when a change would leave no active admin — deactivating the last one or dropping their
 * admin role — which would lock everyone out of administration. Surfaces as a 409.
 */
public class LastActiveAdminException extends RuntimeException {}
