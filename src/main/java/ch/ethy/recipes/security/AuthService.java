package ch.ethy.recipes.security;

import ch.ethy.recipes.user.User;
import ch.ethy.recipes.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final PasswordEncoder passwordEncoder;
  private final UserRepository userRepository;

  public AuthService(
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      PasswordEncoder passwordEncoder,
      UserRepository userRepository) {
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.passwordEncoder = passwordEncoder;
    this.userRepository = userRepository;
  }

  public String login(LoginCredentials credentials) {
    UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(
            credentials.usernameOrEmail(), credentials.password());

    Authentication authentication = authenticationManager.authenticate(authToken);
    org.springframework.security.core.userdetails.User user =
        (org.springframework.security.core.userdetails.User) authentication.getPrincipal();
    assert user != null;
    return jwtService.generateToken(user.getUsername());
  }

  public void register(RegistrationDetails registrationDetails) {
    String encodedPassword = passwordEncoder.encode(registrationDetails.password());
    User user = new User();
    user.setUsername(registrationDetails.username());
    user.setEmail(registrationDetails.email());
    user.setPassword(encodedPassword);
    userRepository.save(user);
  }
}
