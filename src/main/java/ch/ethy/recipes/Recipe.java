package ch.ethy.recipes;

import ch.ethy.recipes.db.BaseEntity;
import jakarta.annotation.Nonnull;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "recipes")
public class Recipe extends BaseEntity {
  @Nonnull private String title;

  public @Nonnull String getTitle() {
    return title;
  }

  public void setTitle(@Nonnull String title) {
    this.title = title;
  }
}
