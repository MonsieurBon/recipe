package ch.ethy.recipes.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.SignatureException;
import java.util.Date;
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

  public String generateToken(String username) {
    return Jwts.builder()
        .subject("User Details")
        .claim("usernameOrEmail", username)
        .issuedAt(new Date())
        .issuer("recipes")
        .signWith(key)
        .compact();
  }

  public String validateTokenAndRetrieveUsername(String token) throws SignatureException {
    Claims claims =
        Jwts.parser().verifyWith(this.key).build().parseSignedClaims(token).getPayload();
    assert claims.getSubject().equals("User Details");
    return claims.get("usernameOrEmail", String.class);
  }
}
