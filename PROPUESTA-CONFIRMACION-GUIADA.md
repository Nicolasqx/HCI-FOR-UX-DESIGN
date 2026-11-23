# Claridad y recuperación ante errores en la confirmación

## 1. Problema (Semana 13 + SUS)
Al enviar el formulario de `index.html` y llegar a `confirmacion.html`, las personas:
- dudaban del **estado** de su envío (¿se envió? ¿qué pasó con mis datos?);
- no podían **corregir** sin riesgo de perder lo escrito.

## 2. ¿Aporta valor una interfaz emergente multimodal?
| Opción | Veredicto | Razón |
|---|---|---|
| **Confirmación guiada en diálogo modal (visual + lector de pantalla)** | **Sí, implementada** | Un solo punto de decisión, resumen legible, avisos explicables. Accesible por teclado y `aria-live`. |
| Voz / dictado / asistente conversacional | No por ahora | Aumenta tiempo y carga cognitiva en un formulario de 4 campos; expone datos en voz alta; añade dependencia de un modelo externo. Se reconsidera si las pruebas muestran dificultades de escritura. |
| Verificación con modelo de lenguaje en la nube | No por ahora | Enviaría datos personales fuera del navegador; las reglas locales cubren los errores frecuentes y son 100 % explicables. |

Honestidad del sistema: la "IA" es una **revisión asistida por reglas locales**. La interfaz lo declara y no simula ser un modelo generativo.

## 3. Principios Human-AI Interaction → implementación
| Principio | Qué se hace | Dónde |
|---|---|---|
| Transparencia | Cada observación tiene “¿Por qué lo marcamos?”; se indica que la revisión es local. | `asistente.js` → `revisar()`, diálogo |
| Control | Nunca se envía ni se sobrescribe solo. Las sugerencias (p. ej. `gmial.com → gmail.com`) se aplican solo al pulsar y con “Deshacer cambio”. Los avisos se pueden ignorar; solo los errores bloquean. | diálogo |
| Confianza | Resumen del envío antes y después; estado (confirmada / anulada) con icono + texto, referencia `CT-AAAAMMDD-####` y línea de progreso. Se aclara que es simulación. | diálogo, `confirmacion.html` |
| Recuperación de errores | Resumen de errores con enlaces al campo, mensaje junto a cada campo (qué pasó, por qué, cómo arreglarlo), borrador automático, “Corregir mis datos”, “Deshacer confirmación”, “Volver a confirmar”, “Borrar mis datos”. | formulario y confirmación |

## 4. Flujo
1. Enviar → si faltan datos: errores accionables, **nada se pierde**, foco al resumen.
2. Si está completo → diálogo “Revisa antes de enviar” (resumen + avisos opcionales).
3. “Confirmar y enviar” → `confirmacion.html` muestra estado, datos y acciones.
4. Desde allí: corregir (vuelve al formulario con datos restaurados), deshacer, re-confirmar o borrar.

Datos: `sessionStorage` (solo esta pestaña, se borra al cerrarla). No hay servidor.

## 5. Reglas de revisión incluidas
Errores: nombre/correo/área vacíos, formato de correo, mensaje < 8 caracteres, casilla sin marcar.
Avisos: nombre de una sola palabra o con dígitos, dominio con probable error de tipeo, correo de ejemplo, mensaje muy breve o con texto repetido, secuencia larga de dígitos (posible dato personal).

## 6. Cómo validarlo (siguiente iteración)
- Repetir la tarea de la Semana 13 con 5 personas y medir: errores no recuperados, tiempo de corrección, “¿se envió?” (pregunta directa).
- Repetir SUS; ítems a vigilar: 4 (¿necesito ayuda?), 5 (funciones integradas), 9 (confianza).
- Criterio de éxito sugerido: ≥ 80 % identifica correctamente el estado final sin ayuda; SUS ≥ al de la Semana 13.

## 7. Archivos
- `js/asistente.js` (nuevo) · `css/estilos.css` (sección final) · `index.html` (atributos `name`, id del formulario, script) · `confirmacion.html` (sección de estado dinámica; el contenido original queda como respaldo si se abre sin solicitud).
