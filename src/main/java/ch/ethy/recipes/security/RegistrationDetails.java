package ch.ethy.recipes.security;

import jakarta.annotation.Nonnull;

public record RegistrationDetails(
    @Nonnull String username, @Nonnull String email, @Nonnull String password) {}
