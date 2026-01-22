package ch.ethy.recipes.user;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public List<UserDto> getAllUsers() {
    return userRepository.findAll().stream()
        .map(user -> new UserDto(user.getId(), user.getUsername(), user.getEmail()))
        .toList();
  }

  public Optional<UserDto> findUser(long id) {
    return userRepository
        .findById(id)
        .map(user -> new UserDto(user.getId(), user.getUsername(), user.getEmail()));
  }
}
