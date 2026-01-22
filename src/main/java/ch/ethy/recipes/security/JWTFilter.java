package ch.ethy.recipes.security;

import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.web.filter.OncePerRequestFilter;

@Service
public class JWTFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserDetailsService userDetailService;

  public JWTFilter(JwtService jwtService, UserDetailsService userDetailService) {
    this.jwtService = jwtService;
    this.userDetailService = userDetailService;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && !authHeader.isBlank() && authHeader.startsWith("Bearer")) {
      String token = authHeader.substring(7);
      if (token.isBlank()) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid token");
      } else {
        try {
          String username = jwtService.validateTokenAndRetrieveUsername(token);
          UserDetails userDetails = userDetailService.loadUserByUsername(username);
          Authentication authentication = new JWTAuthenticationToken(userDetails, token);

          if (SecurityContextHolder.getContext().getAuthentication() == null) {
            SecurityContextHolder.getContext().setAuthentication(authentication);
          }
        } catch (SignatureException e) {
          response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        }
      }
    }

    filterChain.doFilter(request, response);
  }
}
