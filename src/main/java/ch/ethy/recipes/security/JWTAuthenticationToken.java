package ch.ethy.recipes.security;

import org.jspecify.annotations.Nullable;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;

public class JWTAuthenticationToken extends AbstractAuthenticationToken {
  private final String token;
  private final UserDetails userDetails;

  public JWTAuthenticationToken(UserDetails userDetails, String token) {
    super(userDetails.getAuthorities());
    this.token = token;
    this.userDetails = userDetails;
    setAuthenticated(true);
  }

  @Override
  public @Nullable Object getCredentials() {
    return token;
  }

  @Override
  public @Nullable Object getPrincipal() {
    return userDetails;
  }
}
