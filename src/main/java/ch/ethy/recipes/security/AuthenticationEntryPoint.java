package ch.ethy.recipes.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationEntryPoint
    implements org.springframework.security.web.AuthenticationEntryPoint {
  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException)
      throws IOException, ServletException {
    // Required by RFC 7235: Instructs clients how to authenticate
    response.setHeader("WWW-Authenticate", "Bearer realm=\"protected-resources\"");
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
  }
}
