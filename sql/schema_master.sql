-- Base maestra: usuarios (rol y estado con ENUM para legibilidad).
-- Nota: si ya tenías la versión con tabla `roles` y `role_id`, haz copia de seguridad
-- y migra manualmente o recrea la base; CREATE TABLE IF NOT EXISTS no altera tablas existentes.

CREATE DATABASE IF NOT EXISTS visual_admin_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE visual_admin_db;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'gestor', 'visualizador') NOT NULL DEFAULT 'visualizador',
  is_active ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_campaign_access (
  user_id INT UNSIGNED NOT NULL,
  campaign_key VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, campaign_key),
  CONSTRAINT fk_uca_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
