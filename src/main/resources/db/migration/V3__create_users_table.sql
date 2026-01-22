CREATE TABLE users
(
  id       BIGINT NOT NULL,
  email    VARCHAR(255),
  password VARCHAR(255),
  roles    JSON,
  username VARCHAR(255),
  PRIMARY KEY (id)
) ENGINE = InnoDB;
