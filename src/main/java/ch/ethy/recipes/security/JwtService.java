package ch.ethy.recipes.security;

import ch.ethy.recipes.user.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.SignatureException;
import java.util.Collection;
import java.util.Date;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private static final String ENCODED_KEY = "tFwpdBXfdVp5ri4doCZdu8dKlFEl3+YgTI/aYiOQAmE=";

  private final SecretKey key;

  public JwtService() {
    this.key = new SecretKeySpec(Decoders.BASE64.decode(ENCODED_KEY), "HmacSHA256");
  }

  public String generateToken(String username, Set<Role> roles) {
    return Jwts.builder()
        .subject("User Details")
        .claim("usernameOrEmail", username)
        .claim("roles", roles.stream().map(Role::name).toList())
        .issuedAt(new Date())
        .issuer("recipes")
        .signWith(key)
        .compact();
  }

  public String validateTokenAndRetrieveUsername(String token) throws SignatureException {
    return parseClaims(token).get("usernameOrEmail", String.class);
  }

  public Set<Role> getRoles(String token) throws SignatureException {
    Object raw = parseClaims(token).get("roles");
    if (!(raw instanceof Collection<?> collection)) {
      return Set.of();
    }
    return collection.stream()
        .filter(item -> item instanceof String)
        .map(item -> toRole((String) item))
        .filter(Objects::nonNull)
        .collect(() -> EnumSet.noneOf(Role.class), Set::add, Set::addAll);
  }

  private static Role toRole(String name) {
    try {
      return Role.valueOf(name);
    } catch (IllegalArgumentException ignored) {
      return null;
    }
  }

  private Claims parseClaims(String token) throws SignatureException {
    return Jwts.parser()
        .verifyWith(this.key)
        .requireSubject("User Details")
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
