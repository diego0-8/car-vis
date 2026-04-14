<?php
// Este script te ayuda a generar un hash de contraseña válido.

// 1. Escribe la contraseña que quieres usar aquí:
$passwordPlano = '123456';

// 2. Genera el hash usando el algoritmo por defecto y seguro de PHP
$hashGenerado = password_hash($passwordPlano, PASSWORD_DEFAULT);

// 3. Muestra el resultado
echo "<div style='font-family: sans-serif; padding: 20px; border: 1px solid #ccc; margin: 20px;'>";
echo "<h2>Generador de Hash de Contraseña</h2>";
echo "<p><strong>Contraseña en texto plano:</strong> " . htmlspecialchars($passwordPlano) . "</p>";
echo "<p><strong>Hash generado (copia esto):</strong></p>";
echo "<textarea rows='3' style='width: 100%; font-family: monospace; font-size: 16px;'>" . htmlspecialchars($hashGenerado) . "</textarea>";
echo "<p style='margin-top: 20px; color: #555;'>Copia el hash de arriba y pégalo en la columna 'password' de tu usuario en la base de datos.</p>";
echo "</div>";

?>