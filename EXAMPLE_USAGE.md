# AI Assistant - Ejemplos de Uso

## Flujo Correcto Esperado

### Ejemplo 1: Crear evento en restaurante italiano

**Request inicial:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quiero hacer un evento de comida italiana"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "response": "¿En qué ciudad te gustaría hacer el evento?",
    "conversationHistory": [...]
  }
}
```

**Segunda request (con ciudad):**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "En Caracas",
    "conversationHistory": [...]
  }'
```

**Comportamiento CORRECTO esperado:**
1. ✅ AI llama \`get_available_places(city: "caracas", type: "restaurante")\`
2. ✅ AI recibe datos REALES de la base de datos con IDs REALES
3. ✅ AI muestra los lugares con sus IDs REALES al usuario

**Comportamiento INCORRECTO (problema previo):**
❌ AI NO llama \`get_available_places\`
❌ AI inventa lugares con IDs falsos (456, 789, 912)

---

## Verificación del Fix

### Checklist de verificación:

1. **AI NUNCA inventa información**
   - Verifica que \`toolsUsed\` incluya \`"get_available_places"\` antes de mostrar lugares
   - Verifica que los IDs mostrados coincidan con IDs reales de la base de datos

2. **AI siempre pide ciudad primero**
   - Si usuario no menciona ciudad, AI pregunta por ella
   - AI NO muestra lugares hasta tener la ciudad

3. **AI muestra múltiples opciones (3-5 mínimo)**
   - Verifica que la respuesta incluya al menos 3 lugares
   - Default limit es 10 en \`get_available_places\`

4. **Mapeo de selección funciona correctamente**
   - "el primero" → ID del índice 0
   - "La Trattoria" → Busca en array y usa su ID real

5. **Date parsing funciona**
   - "mañana" → Mañana a las 8pm
   - "domingo 6pm" → Próximo domingo a las 6pm

---

## Comandos de Prueba Rápida

### 1. Verificar salud del servicio
```bash
curl http://localhost:3000/api/ai/health
```

### 2. Ver herramientas disponibles
```bash
curl http://localhost:3000/api/ai/tools
```

### 3. Test básico (requiere token JWT válido)
```bash
# Primero obtén un token de autenticación
# Luego prueba el AI:
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quiero crear un evento en un bar en Caracas"
  }' | jq '.'
```

Verifica en los logs del servidor que aparezca:
```
AI calling tool: get_available_places { city: 'caracas', type: 'bar' }
```

**IMPORTANTE:** Si el AI responde con lugares SIN llamar primero a \`get_available_places\`, el bug todavía existe.
