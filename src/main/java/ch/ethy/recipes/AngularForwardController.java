package ch.ethy.recipes;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AngularForwardController {
  @GetMapping("{path:^(?!api|media|assets|swagger)[^\\.]*}/**")
  public String handleForward() {
    return "forward:/";
  }
}
