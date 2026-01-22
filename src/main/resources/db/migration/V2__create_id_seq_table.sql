CREATE TABLE id_seq
(
  next_val bigint
) engine=InnoDB;

INSERT INTO id_seq (next_val)
VALUES (1);
