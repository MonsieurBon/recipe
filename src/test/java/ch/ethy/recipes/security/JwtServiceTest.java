package ch.ethy.recipes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
  private final JwtService jwtService = new JwtService();

  @Test
  void generateTokenEncodesUsername() {
    String token = jwtService.generateToken("alice", List.of());

    assertEquals("alice", jwtService.validateTokenAndRetrieveUsername(token));
  }

  @Test
  void generateTokenEncodesRoles() {
    String token = jwtService.generateToken("alice", List.of("ROLE_USER", "ROLE_ADMIN"));

    assertEquals(Set.of("ROLE_USER", "ROLE_ADMIN"), Set.copyOf(jwtService.getRoles(token)));
  }

  @Test
  void getRolesReturnsEmptyListWhenNoneEncoded() {
    String token = jwtService.generateToken("alice", List.of());

    assertTrue(jwtService.getRoles(token).isEmpty());
  }
}
