CREATE USER IF NOT EXISTS 'recipes' IDENTIFIED BY '${db_password}';
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes.* TO 'recipes';
