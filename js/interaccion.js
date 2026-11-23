// ==========================================================================
// CALCULADORA INTERACTIVA DE IMPACTO CLIMÁTICO (ODS 13 - CLIMATE TRACE)
// ==========================================================================

// 1. SELECCIÓN DE ELEMENTOS DEL DOM
const selectAccion = document.querySelector('#tipo-accion');
const inputCantidad = document.querySelector('#cantidad-unidades');
const btnCalcular = document.querySelector('#btn-calcular');
const tarjetaResultado = document.querySelector('#tarjeta-resultado');
const mensajeResultado = document.querySelector('#mensaje-resultado');
const bloqueMonto = document.querySelector('#bloque-monto');
const valorCO2 = document.querySelector('#valor-co2');

// 2. FUNCIÓN DE CÁLCULO E INTERACCIÓN
function calcularImpacto() {
  // Convertir los valores ingresados a tipos numéricos
  const factor = parseFloat(selectAccion.value);
  const cantidad = parseInt(inputCantidad.value, 10);

  // Criterio de Aceptación 2: Validación de Entradas
  if (isNaN(factor)) {
    mostrarMensaje('Por favor, selecciona un tipo de acción climática válido.', true);
    selectAccion.focus();
    return;
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarMensaje('Ingresa una cantidad válida mayor a 0.', true);
    inputCantidad.focus();
    return;
  }

  // Criterio de Aceptación 3: Cálculo dinámico de toneladas de CO2
  const totalCO2 = (factor * cantidad).toFixed(1);

  // Criterio de Aceptación 4: Feedback Visual en el DOM
  valorCO2.textContent = totalCO2;
  bloqueMonto.hidden = false;
  mostrarMensaje(`Basado en ${cantidad} unidad(es) de la acción seleccionada:`, false);
}

// FUNCIÓN AUXILIAR PARA MOSTRAR ESTADOS EN EL DOM
function mostrarMensaje(texto, esError) {
  tarjetaResultado.hidden = false;
  mensajeResultado.textContent = texto;

  if (esError) {
    mensajeResultado.className = 'mensaje-error';
    bloqueMonto.hidden = true;
  } else {
    mensajeResultado.className = 'mensaje-exito';
  }
}

// 3. REGISTRO DE EVENTOS (EVENT LISTENERS)
// Evento clic sobre el botón de calcular
if (btnCalcular && inputCantidad) {
  btnCalcular.addEventListener('click', calcularImpacto);

// Evento de teclado: Ejecutar cálculo al presionar 'Enter' en el campo numérico
  inputCantidad.addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault(); // Evita la recarga o envío del formulario
      calcularImpacto();
    }
  });
}

// ==========================================================================
// BÚSQUEDA ASISTIDA CON RECONOCIMIENTO DE VOZ Y SUGERENCIAS GUIADAS
// ==========================================================================
(function iniciarBuscadorRecursos() {
  const inputBusqueda = document.querySelector('#input-busqueda-recursos');
  const btnVoz = document.querySelector('#btn-voz');
  const textoBtnVoz = document.querySelector('#texto-btn-voz');
  const btnLimpiar = document.querySelector('#btn-limpiar-busqueda');
  const estadoBusqueda = document.querySelector('#estado-busqueda-voz');
  const listaRecursos = document.querySelector('#lista-recursos');
  const sinResultados = document.querySelector('#sin-resultados-recursos');
  const chips = document.querySelectorAll('.chip-sugerencia');

  // Si no estamos en recursos.html, salir sin hacer nada
  if (!inputBusqueda || !listaRecursos) return;

  const tarjetas = Array.from(listaRecursos.querySelectorAll('.recurso-item'));
  const totalRecursos = tarjetas.length;

  // Normaliza texto (quita tildes, mayúsculas y signos de puntuación del dictado)
  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,¿?¡!]/g, '')
      .trim();
  }

  // Filtra las tarjetas y actualiza feedback accesible
  function filtrarRecursos(terminoOriginal, origen) {
    const consulta = normalizarTexto(terminoOriginal);
    let visibles = 0;

    tarjetas.forEach(function (tarjeta) {
      const contenido = normalizarTexto(
        tarjeta.textContent + ' ' + (tarjeta.dataset.keywords || '')
      );
      const coincide = consulta === '' || contenido.includes(consulta);
      tarjeta.classList.toggle('recurso-oculto', !coincide);
      if (coincide) visibles++;
    });

    btnLimpiar.hidden = consulta === '';
    sinResultados.hidden = visibles > 0;

    if (consulta === '') {
      estadoBusqueda.textContent = `Mostrando ${visibles} de ${totalRecursos} recursos disponibles.`;
    } else if (origen === 'voz') {
      estadoBusqueda.textContent = `Búsqueda por voz "${terminoOriginal.trim()}": ${visibles} resultado(s).`;
    } else {
      estadoBusqueda.textContent = `Resultados para "${terminoOriginal.trim()}": ${visibles} de ${totalRecursos}.`;
    }

    // Sincronizar estado visual de los chips
    chips.forEach(function (chip) {
      const chipNorm = normalizarTexto(chip.dataset.termino || '');
      chip.classList.toggle('activo', chipNorm === consulta);
    });
  }

  // Escritura manual en tiempo real
  inputBusqueda.addEventListener('input', function () {
    filtrarRecursos(inputBusqueda.value, 'texto');
  });

  // Sugerencias guiadas (chips)
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const termino = chip.dataset.termino || '';
      inputBusqueda.value = termino;
      filtrarRecursos(termino, 'chip');
    });
  });

  // Botón limpiar
  btnLimpiar.addEventListener('click', function () {
    inputBusqueda.value = '';
    filtrarRecursos('', 'limpiar');
    inputBusqueda.focus();
  });

  // Reconocimiento de voz (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    btnVoz.disabled = true;
    textoBtnVoz.textContent = 'Voz no soportada';
    btnVoz.title = 'Tu navegador no soporta reconocimiento de voz. Usa las sugerencias o el buscador.';
    return;
  }

  const reconocimiento = new SpeechRecognition();
  reconocimiento.lang = 'es-PE';
  reconocimiento.interimResults = false;
  reconocimiento.maxAlternatives = 1;

  let escuchando = false;

  function actualizarEstadoMic(activo) {
    escuchando = activo;
    btnVoz.classList.toggle('escuchando', activo);
    btnVoz.setAttribute('aria-pressed', String(activo));
    textoBtnVoz.textContent = activo ? 'Escuchando...' : 'Dictar';
  }

  btnVoz.addEventListener('click', function () {
    if (escuchando) {
      reconocimiento.stop();
      return;
    }
    try {
      reconocimiento.start();
    } catch (e) {
      estadoBusqueda.textContent = 'El micrófono ya está activo. Habla ahora.';
    }
  });

  reconocimiento.addEventListener('start', function () {
    actualizarEstadoMic(true);
    estadoBusqueda.textContent = 'Escuchando... Di un tema como "emisiones", "ODS 13" o "talleres".';
  });

  reconocimiento.addEventListener('result', function (evento) {
    const transcripcion = evento.results[0][0].transcript.replace(/\.$/, '').trim();
    inputBusqueda.value = transcripcion;
    filtrarRecursos(transcripcion, 'voz');
  });

  reconocimiento.addEventListener('error', function (evento) {
    if (evento.error === 'not-allowed') {
      estadoBusqueda.textContent = 'Permiso de micrófono denegado. Puedes usar las sugerencias guiadas.';
    } else if (evento.error === 'no-speech') {
      estadoBusqueda.textContent = 'No se detectó voz. Intenta de nuevo o toca una sugerencia.';
    } else {
      estadoBusqueda.textContent = 'No se pudo completar el dictado por voz. Intenta nuevamente.';
    }
  });

  reconocimiento.addEventListener('end', function () {
    actualizarEstadoMic(false);
  });
})();
