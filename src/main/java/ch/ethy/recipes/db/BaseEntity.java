package ch.ethy.recipes.db;

import jakarta.persistence.*;

@MappedSuperclass
public class BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "id-seq")
  @SequenceGenerator(name = "id-seq", sequenceName = "id_seq")
  private long id;

  public long getId() {
    return id;
  }

  public void setId(long id) {
    this.id = id;
  }
}
