# Security Fixes Summary

## Cambios aplicados
- Se evita exponer hashes al obtener y actualizar usuarios; además se restringen los campos modificables por clientes y se rehashan contraseñas cuando procede (`src/routes/users.ts`, `src/schemas/userSchemas.ts`).
- Se aseguran las compras y reembolsos de tickets utilizando autenticación, verificación de propietarios y reutilizando la lógica de autorización existente (`src/routes/tickets.ts`).
- Se refuerza la gobernanza de solicitudes comunitarias con autenticación obligatoria, controles de rol y manejo seguro de aprobaciones (`src/routes/requests.ts`).
- Se corrige el filtro de fechas en eventos para combinar correctamente rangos `gte`/`lte` y evitar resultados erróneos (`src/routes/events.ts`).
- Las reseñas ahora exigen autenticación, reutilizan el `userId` del token y solo permiten modificaciones o eliminaciones por parte del autor o de un administrador (`src/routes/reviews.ts`).
- La utilería de correo deja de depender de Gmail y acepta configuración parametrizable por servicio o por host/puerto, incluyendo remitente configurable (`src/utils/email.ts`, `.env.example`).

## Recomendaciones adicionales
- Añadir pruebas automatizadas que cubran flujos críticos de autenticación, gobernanza de comunidades, compras y reseñas.
- Implementar chequeos de rate limiting o detección de abuso en endpoints sensibles (reset de contraseña, reseñas, compras).
- Centralizar la construcción de respuestas de error para ofrecer códigos y mensajes consistentes entre módulos.
