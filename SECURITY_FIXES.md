# Security Fixes Summary

## Cambios aplicados
- Se evita exponer hashes al obtener y actualizar usuarios; además se restringen los campos modificables por clientes y se rehashan contraseñas cuando procede (`src/routes/users.ts`, `src/schemas/userSchemas.ts`).
- Se aseguran las compras y reembolsos de tickets utilizando autenticación, verificación de propietarios y reutilizando la lógica de autorización existente (`src/routes/tickets.ts`).
- Se refuerza la gobernanza de solicitudes comunitarias con autenticación obligatoria, controles de rol y manejo seguro de aprobaciones (`src/routes/requests.ts`).
- Se corrige el filtro de fechas en eventos para combinar correctamente rangos `gte`/`lte` y evitar resultados erróneos (`src/routes/events.ts`).

## Recomendaciones adicionales
- Añadir pruebas automatizadas que cubran flujos críticos de autenticación, gobernanza de comunidades y compras.
- Revisar los permisos restantes en otros módulos (por ejemplo, reseñas) para asegurar que también usan IDs derivados del token y no del payload.
- Considerar la parametrización de la configuración de correo electrónico para entornos que no utilicen Gmail nativamente.
