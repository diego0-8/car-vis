-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 13-04-2026 a las 21:19:39
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `visual1`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `acuerdos_pago`
--

CREATE TABLE `acuerdos_pago` (
  `id` int(10) UNSIGNED NOT NULL,
  `fecha_acuerdo` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','gestor','visualizador') NOT NULL DEFAULT 'visualizador',
  `is_active` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `is_active`, `created_at`) VALUES
(1, 'cordinador1', '$2y$10$SzUqW6eYXjVEltHaDe4dZOWnJjEDTq3Jn75aRrw5l0iftyqweQSRm', 'admin', 'activo', '2026-04-13 17:36:05'),
(2, 'oscar1', '$2y$10$jUuN.9gHKFGKajG8pphubOm6SYjb1L6I.r3d6wTDE0AkNBfn9OwEi', 'admin', 'inactivo', '2026-04-13 17:39:16'),
(3, 'oscar2', '$2y$10$ocp9mNn1mL9czIB7xeKiFuh5Biv5gzSaltDLh.rgxiBLxUU6I96RW', 'gestor', 'activo', '2026-04-13 17:39:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_campaign_access`
--

CREATE TABLE `user_campaign_access` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `campaign_key` varchar(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `acuerdos_pago`
--
ALTER TABLE `acuerdos_pago`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha_acuerdo` (`fecha_acuerdo`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`);

--
-- Indices de la tabla `user_campaign_access`
--
ALTER TABLE `user_campaign_access`
  ADD PRIMARY KEY (`user_id`,`campaign_key`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `acuerdos_pago`
--
ALTER TABLE `acuerdos_pago`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `user_campaign_access`
--
ALTER TABLE `user_campaign_access`
  ADD CONSTRAINT `fk_uca_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
