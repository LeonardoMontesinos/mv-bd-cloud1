SET NAMES utf8mb4;
USE usersdb;

LOAD DATA INFILE '/var/lib/mysql-files/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ',' ENCLOSED BY '"' 
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id, email, password_hash, phone_number, first_name, surname, @is_active, @created_at, @updated_at)
SET
  id = IF(NULLIF(@id,'') IS NULL, UUID(), @id),
  is_active = CASE LOWER(COALESCE(@is_active,'1'))
                WHEN '1' THEN 1 WHEN 't' THEN 1 WHEN 'true' THEN 1 WHEN 'yes' THEN 1 WHEN 'y' THEN 1
                WHEN '0' THEN 0 WHEN 'f' THEN 0 WHEN 'false' THEN 0 WHEN 'no'  THEN 0 WHEN 'n' THEN 0
                ELSE 1
              END,
  created_at = IFNULL(STR_TO_DATE(@created_at, '%Y-%m-%d %H:%i:%s'), NOW()),
  updated_at = IFNULL(STR_TO_DATE(@updated_at, '%Y-%m-%d %H:%i:%s'), NOW());
