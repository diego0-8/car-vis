-- Ejemplo de tabla en cada BD de campaña (ajusta nombres en config/campaigns.php si difieren).
CREATE TABLE IF NOT EXISTS acuerdos_pago (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_acuerdo DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_fecha_acuerdo (fecha_acuerdo)
) ENGINE=InnoDB;
