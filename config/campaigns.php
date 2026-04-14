<?php

declare(strict_types=1);

/**
 * Lista blanca: slug => metadatos de campaña y esquema de acuerdos.
 *
 * Opcional:
 * - acuerdos_filter_column + acuerdos_filter_value: filtro extra (ej. solo tipo_gestion = acuerdo_pago).
 *   La fecha del rango sigue siendo acuerdos_date_column (ej. fecha_gestion).
 */
return [
    'Emermedica Cobranza' => [
        'label' => 'Emermedica Cobranza',
        'database' => 'felipe',
        'acuerdos_table' => 'historial_gestion',
        'acuerdos_date_column' => 'fecha_gestion',
        'acuerdos_filter_column' => 'tipo_gestion',
        'acuerdos_filter_value' => 'contacto_exitoso|acuerdo_pago',
    ],
    'Banco W' => [
        'label' => 'Banco W',
        'database' => 'banco',
        'acuerdos_table' => 'historial_gestion',
        'acuerdos_date_column' => 'fecha_creacion',
        'acuerdos_filter_column' => 'nivel1_tipo',
        'acuerdos_filter_value' => 'ACUERDO DE PAGO',
    ],

    'Apex' => [
        'label' => 'Apex',
        'database' => 'apex',
        'acuerdos_table' => 'gestiones',
        'acuerdos_date_column' => 'fecha_creacion',
        'acuerdos_filter_column' => 'nivel2_clasificacion',
        'acuerdos_filter_value' => '1.1',
    ],

    'Incomercio' => [
        'label' => 'Incomercio',
        'database' => 'yeimy',
        'acuerdos_table' => 'historial_gestion',
        'acuerdos_date_column' => 'fecha_gestion',
        'acuerdos_filter_column' => 'resultado',
        'acuerdos_filter_value' => '03',
    ],

    'Credibanco' => [
        'label' => 'Credibanco',
        'database' => 'credibanco',
        'acuerdos_table' => 'gestiones',
        'acuerdos_date_column' => 'fecha_creacion',
        'acuerdos_filter_column' => 'nivel2_clasificacion',
        'acuerdos_filter_value' => 'ACUERDO DE PAGO',
    ],
    'AXA' => [
        'label' => 'Axa',
        'database' => 'axa',
        'acuerdos_table' => 'gestiones',
        'acuerdos_date_column' => 'fecha_creacion',
        'acuerdos_filter_column' => 'nivel2_clasificacion',
        'acuerdos_filter_value' => 'Con intención de pago',
    ],
];
