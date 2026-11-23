// ==========================================================================
// ASISTENTE DE CONFIRMACIÓN GUIADA (Human-AI Interaction)
// --------------------------------------------------------------------------
// Qué es: una revisión asistida que verifica el formulario, anticipa errores
// comunes y guía la confirmación. Funciona con REGLAS LOCALES (no usa un
// modelo en la nube ni envía datos a ningún servidor) y lo dice en pantalla.
//
// Principios aplicados:
//  - Transparencia: cada observación trae un "¿Por qué lo marcamos?".
//  - Control: nada se envía ni se corrige solo; las sugerencias se aplican
//    únicamente cuando la persona pulsa el botón.
//  - Confianza: resumen legible de lo que se va a enviar y de su estado final.
//  - Recuperación: mensajes accionables, borrador conservado, corregir/deshacer.
//
// Se carga en index.html (formulario) y en confirmacion.html (estado).
// ==========================================================================
(function () {
  'use strict';

  // ---------- 0. ALMACENAMIENTO (sessionStorage: solo esta pestaña) ----------
  const CLAVE_BORRADOR = 'ct_borrador_v1';
  const CLAVE_SOLICITUD = 'ct_solicitud_v1';

  const almacen = {
    leer(clave) {
      try { return JSON.parse(sessionStorage.getItem(clave)); } catch (e) { return null; }
    },
    guardar(clave, valor) {
      try { sessionStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
    },
    borrar(clave) {
      try { sessionStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
    }
  };

  // ---------- 1. UTILIDADES ----------
  // Crea elementos con textContent (nunca innerHTML con datos de la persona).
  function el(tag, attrs, hijos) {
    const nodo = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v === null || v === undefined) return;
      if (k === 'texto') nodo.textContent = v;
      else if (k === 'clase') nodo.className = v;
      else nodo.setAttribute(k, v === true ? '' : v);
    });
    [].concat(hijos || []).forEach(h => nodo.append(h));
    return nodo;
  }

  function hace(ts) {
    const seg = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (seg < 60) return 'hace unos segundos';
    const min = Math.round(seg / 60);
    if (min < 60) return `hace ${min} min`;
    return `hace ${Math.round(min / 60)} h`;
  }

  const ETIQUETAS = {
    nombre: 'Nombre completo',
    correo: 'Correo electrónico',
    actividad: 'Área de interés',
    detalle: 'Consulta o mensaje',
    acepto: 'Aceptación de la simulación'
  };

  // ---------- 2. REVISIÓN ASISTIDA (reglas explicables) ----------
  const DOMINIOS_CON_ERROR = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.con': 'gmail.com',
    'gamil.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
    'outlok.com': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com'
  };
  const DOMINIOS_DE_EJEMPLO = ['ejemplo.org', 'ejemplo.com', 'example.com', 'example.org', 'test.com'];

  // Devuelve { errores: [], avisos: [] }.
  //  - errores: impiden confirmar (falta algo necesario).
  //  - avisos: se pueden ignorar; solo ayudan a evitar un error probable.
  function revisar(d) {
    const errores = [];
    const avisos = [];
    const nombre = (d.nombre || '').trim();
    const correo = (d.correo || '').trim();
    const detalle = (d.detalle || '').trim();

    // --- Errores ---
    if (!nombre) {
      errores.push({ campo: 'nombre', msg: 'Escribe tu nombre completo.',
        porque: 'Lo usamos para saber a quién dirigirnos en la respuesta.' });
    }
    if (!correo) {
      errores.push({ campo: 'correo', msg: 'Escribe tu correo electrónico.',
        porque: 'Es el único medio por el que podríamos responderte.' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      errores.push({ campo: 'correo', msg: 'Revisa el correo: debería verse como nombre@dominio.org.',
        porque: 'Falta el “@” o la terminación del dominio, por lo que no podríamos entregarlo.' });
    }
    if (!d.actividad) {
      errores.push({ campo: 'actividad', msg: 'Elige un área de interés.',
        porque: 'Así dirigimos tu consulta a la persona adecuada.' });
    }
    if (detalle.length < 8) {
      errores.push({ campo: 'detalle', msg: 'Cuéntanos un poco más (mínimo 8 caracteres).',
        porque: detalle.length
          ? `Ahora tiene ${detalle.length} caracteres; con menos de 8 no se entiende la solicitud.`
          : 'El mensaje está vacío, y sin él no sabríamos qué necesitas.' });
    }
    if (!d.acepto) {
      errores.push({ campo: 'acepto', msg: 'Marca la casilla para confirmar que entiendes que es una simulación.',
        porque: 'Este proyecto es educativo: no se enviará información a un servicio real.' });
    }

    // --- Avisos (solo si el campo no tiene ya un error) ---
    const tieneError = campo => errores.some(e => e.campo === campo);

    if (nombre && !tieneError('nombre')) {
      if (/\d/.test(nombre)) {
        avisos.push({ campo: 'nombre', msg: 'Tu nombre contiene números.',
          porque: 'Los nombres rara vez incluyen dígitos; puede ser un error de tipeo.' });
      } else if (nombre.split(/\s+/).length < 2) {
        avisos.push({ campo: 'nombre', msg: '¿Falta tu apellido?',
          porque: 'Pedimos nombre completo y aquí solo detectamos una palabra. Puedes continuar si es correcto.' });
      }
    }

    if (correo && !tieneError('correo')) {
      const dominio = correo.split('@')[1].toLowerCase();
      if (DOMINIOS_CON_ERROR[dominio]) {
        const corregido = correo.split('@')[0] + '@' + DOMINIOS_CON_ERROR[dominio];
        avisos.push({ campo: 'correo', msg: `¿Quisiste escribir “${DOMINIOS_CON_ERROR[dominio]}”?`,
          porque: `“${dominio}” se parece mucho a un dominio muy usado y suele ser un error de tipeo.`,
          sugerencia: { etiqueta: `Usar ${corregido}`, valor: corregido } });
      } else if (DOMINIOS_DE_EJEMPLO.includes(dominio)) {
        avisos.push({ campo: 'correo', msg: 'Parece un correo de ejemplo.',
          porque: `“${dominio}” se usa en los textos de ayuda del formulario. Si es tu correo real, continúa.` });
      }
    }

    if (detalle && !tieneError('detalle')) {
      if (/(.)\1{4,}/.test(detalle)) {
        avisos.push({ campo: 'detalle', msg: 'El mensaje parece texto de prueba.',
          porque: 'Detectamos un carácter repetido varias veces seguidas (por ejemplo “aaaaa”).' });
      } else if (detalle.length < 25) {
        avisos.push({ campo: 'detalle', msg: 'Tu mensaje es muy breve.',
          porque: 'Con más contexto (qué, dónde, cuándo) es más fácil darte una respuesta útil.' });
      }
      if (/\d[\d\s.-]{7,}\d/.test(detalle)) {
        avisos.push({ campo: 'detalle', msg: 'El mensaje parece incluir un número personal.',
          porque: 'Hay una secuencia larga de dígitos (¿teléfono, documento?). No es necesario para esta consulta; considera quitarlo.' });
      }
    }

    return { errores, avisos };
  }

  // ---------- 3. PÁGINA DEL FORMULARIO (index.html) ----------
  function iniciarFormulario(form) {
    const campos = {
      nombre: form.querySelector('#nombre'),
      correo: form.querySelector('#correo'),
      actividad: form.querySelector('#actividad'),
      detalle: form.querySelector('#detalle'),
      acepto: form.querySelector('#acepto')
    };
    if (!Object.values(campos).every(Boolean)) return;

    // Mejora progresiva: sin JS, la validación nativa sigue funcionando.
    form.setAttribute('novalidate', '');

    const leerDatos = () => ({
      nombre: campos.nombre.value,
      correo: campos.correo.value,
      actividad: campos.actividad.value,
      detalle: campos.detalle.value,
      acepto: campos.acepto.checked
    });

    const escribirDatos = d => {
      campos.nombre.value = d.nombre || '';
      campos.correo.value = d.correo || '';
      campos.actividad.value = d.actividad || '';
      campos.detalle.value = d.detalle || '';
      campos.acepto.checked = !!d.acepto;
    };

    // --- 3.1 Borrador automático (recuperación sin perder progreso) ---
    let temporizador;
    const guardarAhora = () => {
      clearTimeout(temporizador);
      const d = leerDatos();
      const hayAlgo = d.nombre || d.correo || d.actividad || d.detalle;
      if (hayAlgo) almacen.guardar(CLAVE_BORRADOR, { datos: d, ts: Date.now() });
    };
    const guardarBorrador = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(guardarAhora, 300);
    };
    // Guardar también al salir de la página, para no perder cambios recientes.
    window.addEventListener('pagehide', guardarAhora);
    document.addEventListener('visibilitychange', () => { if (document.hidden) guardarAhora(); });
    form.addEventListener('input', guardarBorrador);
    form.addEventListener('change', guardarBorrador);

    // Aviso para el borrador recuperado, con control explícito para descartarlo.
    const zonaAviso = el('div', { id: 'aviso-borrador', clase: 'aviso-form', role: 'status' });
    form.prepend(zonaAviso);
    zonaAviso.hidden = true;

    function mostrarAvisoBorrador(texto, conDescartar) {
      zonaAviso.replaceChildren(el('p', { texto }));
      if (conDescartar) {
        const btn = el('button', { type: 'button', clase: 'boton-secundario', texto: 'Descartar borrador' });
        btn.addEventListener('click', () => {
          almacen.borrar(CLAVE_BORRADOR);
          form.reset();
          limpiarErrores();
          zonaAviso.replaceChildren(el('p', { texto: 'Borrador descartado. El formulario quedó vacío.' }));
          campos.nombre.focus();
        });
        zonaAviso.append(btn);
      }
      zonaAviso.hidden = false;
    }

    const borrador = almacen.leer(CLAVE_BORRADOR);
    const solicitud = almacen.leer(CLAVE_SOLICITUD);
    const venimosACorregir = location.hash === '#contacto' && solicitud && solicitud.estado !== 'confirmada';
    const fuente = borrador || (solicitud && { datos: solicitud.datos, ts: solicitud.ts });
    if (fuente && fuente.datos) {
      escribirDatos(fuente.datos);
      mostrarAvisoBorrador(
        (venimosACorregir ? 'Volviste a corregir tu solicitud. ' : 'Recuperamos tus datos. ') +
        `Último cambio ${hace(fuente.ts)}. No se ha enviado nada.`, true);
    }

    // --- 3.2 Errores: resumen arriba + mensaje junto a cada campo ---
    const resumen = el('div', { id: 'resumen-errores', clase: 'resumen-errores', role: 'alert', tabindex: '-1' });
    resumen.hidden = true;
    form.prepend(resumen);

    function limpiarErrores() {
      resumen.hidden = true;
      resumen.replaceChildren();
      Object.entries(campos).forEach(([nombre, campo]) => {
        campo.removeAttribute('aria-invalid');
        const prev = form.querySelector('#err-' + nombre);
        if (prev) prev.remove();
        const desc = (campo.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== 'err-' + nombre);
        if (desc.length) campo.setAttribute('aria-describedby', desc.join(' '));
        else campo.removeAttribute('aria-describedby');
      });
    }

    function mostrarErrores(errores) {
      limpiarErrores();
      const lista = el('ul');
      errores.forEach(e => {
        const campo = campos[e.campo];
        campo.setAttribute('aria-invalid', 'true');
        campo.setAttribute('aria-describedby', ((campo.getAttribute('aria-describedby') || '') + ' err-' + e.campo).trim());
        const contenedor = e.campo === 'acepto' ? campo.parentElement : campo;
        const msg = el('p', { id: 'err-' + e.campo, clase: 'error-campo' }, [
          el('span', { 'aria-hidden': 'true', texto: '⚠ ' }), e.msg, ' ',
          el('span', { clase: 'por-que', texto: e.porque })
        ]);
        contenedor.insertAdjacentElement('afterend', msg);

        const enlace = el('a', { href: '#' + e.campo, texto: e.msg });
        enlace.addEventListener('click', ev => { ev.preventDefault(); campo.focus(); });
        lista.append(el('li', {}, enlace));
      });
      resumen.append(
        el('p', { clase: 'resumen-titulo', texto: errores.length === 1
          ? 'Falta 1 dato para continuar. No se perdió nada de lo que escribiste.'
          : `Faltan ${errores.length} datos para continuar. No se perdió nada de lo que escribiste.` }),
        lista);
      resumen.hidden = false;
      resumen.focus();
    }

    // Al corregir un campo, su error desaparece (feedback inmediato).
    Object.entries(campos).forEach(([nombre, campo]) => {
      const evento = nombre === 'actividad' || nombre === 'acepto' ? 'change' : 'input';
      campo.addEventListener(evento, () => {
        const err = form.querySelector('#err-' + nombre);
        if (err) { err.remove(); campo.removeAttribute('aria-invalid'); }
        if (!form.querySelector('.error-campo')) { resumen.hidden = true; resumen.replaceChildren(); }
      });
    });

    // --- 3.3 Diálogo de confirmación guiada ---
    const dialogo = crearDialogo();
    document.body.append(dialogo.nodo);

    function abrirConfirmacion(datos, avisos, boton) {
      avisos.forEach(a => { if (a.valorAnterior === undefined) a.valorAnterior = campos[a.campo].value; });
      dialogo.mostrar(datos, avisos, {
        corregir(avisoCampo) {
          dialogo.nodo.close();
          const destino = campos[avisoCampo] || campos.nombre;
          destino.focus();
        },
        aplicarSugerencia(aviso) {
          campos[aviso.campo].value = aviso.sugerencia.valor;
          guardarBorrador();
          const nuevos = revisar(leerDatos());
          abrirConfirmacion(leerDatos(), nuevos.avisos, boton);
          dialogo.anunciar(`Se aplicó: ${aviso.sugerencia.etiqueta}. Puedes deshacerlo con el botón “Deshacer cambio”.`, () => {
            campos[aviso.campo].value = aviso.valorAnterior;
            guardarBorrador();
            abrirConfirmacion(leerDatos(), revisar(leerDatos()).avisos, boton);
          });
        },
        confirmar() {
          const d = leerDatos();
          const id = 'CT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(1000 + Math.random() * 9000));
          const ok = almacen.guardar(CLAVE_SOLICITUD, { id, datos: d, estado: 'confirmada', ts: Date.now(), avisos: avisos.length });
          dialogo.nodo.close();
          location.href = ok ? 'confirmacion.html' : 'confirmacion.html?sin-almacenamiento=1';
        }
      });
      if (!dialogo.nodo.open) dialogo.nodo.showModal();
      if (boton) dialogo.nodo.addEventListener('close', () => boton.focus(), { once: true });
    }

    form.addEventListener('submit', evento => {
      evento.preventDefault();
      guardarAhora();
      const datos = leerDatos();
      const { errores, avisos } = revisar(datos);
      if (errores.length) {
        mostrarErrores(errores);
        return;
      }
      limpiarErrores();
      // Guardamos el valor previo para poder deshacer sugerencias aplicadas.
      avisos.forEach(a => { a.valorAnterior = campos[a.campo] ? campos[a.campo].value : ''; });
      abrirConfirmacion(datos, avisos, form.querySelector('[type="submit"]'));
    });
  }

  function crearDialogo() {
    const nodo = el('dialog', { id: 'dialogo-confirmacion', clase: 'dialogo', 'aria-labelledby': 'dlg-titulo', 'aria-describedby': 'dlg-estado' });
    let acciones = null;

    function mostrar(datos, avisos, cb) {
      acciones = cb;
      nodo.replaceChildren();

      const hayAvisos = avisos.length > 0;
      const estadoTexto = hayAvisos
        ? `Todo está completo. Tenemos ${avisos.length} sugerencia${avisos.length > 1 ? 's' : ''} opcional${avisos.length > 1 ? 'es' : ''} antes de enviar.`
        : 'Todo está completo y no detectamos nada raro.';

      nodo.append(
        el('h2', { id: 'dlg-titulo', texto: 'Revisa antes de enviar' }),
        el('p', { id: 'dlg-estado', clase: hayAvisos ? 'estado estado-aviso' : 'estado estado-ok' }, [
          el('span', { 'aria-hidden': 'true', texto: hayAvisos ? '⚠ ' : '✔ ' }), estadoTexto
        ]),
        el('p', { clase: 'nota-ia', texto: 'Revisión asistida con reglas en tu navegador: no se envía nada a ningún servidor y nada cambia sin que tú lo decidas.' })
      );

      // Resumen legible de lo que se enviará
      const dl = el('dl', { clase: 'resumen-datos' });
      [['nombre', datos.nombre.trim()], ['correo', datos.correo.trim()],
       ['actividad', datos.actividad], ['detalle', datos.detalle.trim()]].forEach(([k, v]) => {
        const botonEditar = el('button', { type: 'button', clase: 'enlace-boton', 'aria-label': 'Editar ' + ETIQUETAS[k].toLowerCase(), texto: 'Editar' });
        botonEditar.addEventListener('click', () => acciones.corregir(k));
        dl.append(el('dt', { texto: ETIQUETAS[k] }), el('dd', {}, [el('span', { texto: v }), ' ', botonEditar]));
      });
      nodo.append(dl);

      // Observaciones con su explicación
      if (hayAvisos) {
        const lista = el('ul', { clase: 'lista-avisos' });
        avisos.forEach(a => {
          const item = el('li', { clase: 'aviso' }, [
            el('p', { clase: 'aviso-msg' }, [el('strong', { texto: ETIQUETAS[a.campo] + ': ' }), a.msg]),
            el('details', {}, [el('summary', { texto: '¿Por qué lo marcamos?' }), el('p', { texto: a.porque })])
          ]);
          const fila = el('div', { clase: 'aviso-acciones' });
          if (a.sugerencia) {
            const usar = el('button', { type: 'button', clase: 'boton-secundario', texto: a.sugerencia.etiqueta });
            usar.addEventListener('click', () => acciones.aplicarSugerencia(a));
            fila.append(usar);
          }
          const editar = el('button', { type: 'button', clase: 'boton-secundario', texto: 'Corregir yo mismo' });
          editar.addEventListener('click', () => acciones.corregir(a.campo));
          fila.append(editar, el('span', { clase: 'o-ignorar', texto: 'o ignorar y continuar abajo' }));
          item.append(fila);
          lista.append(item);
        });
        nodo.append(lista);
      }

      nodo.append(el('div', { id: 'dlg-aviso-vivo', role: 'status', 'aria-live': 'polite', clase: 'aviso-vivo' }));

      const volver = el('button', { type: 'button', clase: 'boton-secundario', texto: 'Volver y corregir' });
      volver.addEventListener('click', () => acciones.corregir('nombre'));
      const confirmar = el('button', { type: 'button', clase: 'boton', texto: 'Confirmar y enviar' });
      confirmar.addEventListener('click', () => acciones.confirmar());
      nodo.append(
        el('p', { clase: 'nota', texto: 'Simulación educativa: “enviar” solo muestra la pantalla de confirmación; no se guarda en ningún servidor.' }),
        el('div', { clase: 'dialogo-pie' }, [volver, confirmar])
      );
    }

    // Mensaje en la zona viva con acción opcional para deshacer.
    function anunciar(texto, deshacer) {
      const zona = nodo.querySelector('#dlg-aviso-vivo');
      if (!zona) return;
      zona.replaceChildren(el('span', { texto: texto + ' ' }));
      if (deshacer) {
        const b = el('button', { type: 'button', clase: 'enlace-boton', texto: 'Deshacer cambio' });
        b.addEventListener('click', deshacer);
        zona.append(b);
      }
    }

    return { nodo, mostrar, anunciar };
  }

  // ---------- 4. PÁGINA DE CONFIRMACIÓN (confirmacion.html) ----------
  function iniciarConfirmacion(seccion) {
    const estatica = document.getElementById('confirmacion-estatica');
    const sol = almacen.leer(CLAVE_SOLICITUD);
    if (!sol || !sol.datos) return; // Sin registro: se mantiene el contenido original.

    if (estatica) estatica.hidden = true;
    seccion.hidden = false;

    function pintar(mensajeVivo) {
      const d = sol.datos;
      const confirmada = sol.estado === 'confirmada';
      seccion.replaceChildren();

      seccion.append(
        el('p', { clase: 'etiqueta', texto: 'Estado de tu solicitud' }),
        el('h1', { id: 'titulo-estado', tabindex: '-1',
          texto: confirmada ? 'Solicitud confirmada (demostración)' : 'Solicitud anulada' }),
        el('p', { clase: 'estado ' + (confirmada ? 'estado-ok' : 'estado-aviso'), role: 'status' }, [
          el('span', { 'aria-hidden': 'true', texto: confirmada ? '✔ ' : '↩ ' }),
          confirmada
            ? `Referencia ${sol.id}. Confirmada ${hace(sol.ts)}. Es una simulación: no se envió nada a un servidor ni se escribió a tu correo.`
            : `Referencia ${sol.id}. Anulaste esta solicitud. Tus datos siguen guardados solo en este navegador y no se envió nada.`
        ])
      );

      // Línea de tiempo textual del estado
      seccion.append(el('ol', { clase: 'linea-estado', 'aria-label': 'Progreso de la solicitud' }, [
        el('li', { clase: 'hecho', texto: 'Datos revisados' }),
        el('li', { clase: confirmada ? 'hecho' : 'anulado', texto: confirmada ? 'Confirmada por ti' : 'Confirmación anulada' }),
        el('li', { clase: 'pendiente', texto: 'Respuesta del equipo (no aplica en la demostración)' })
      ]));

      const dl = el('dl', { clase: 'resumen-datos' });
      [['nombre', d.nombre.trim()], ['correo', d.correo.trim()], ['actividad', d.actividad], ['detalle', d.detalle.trim()]]
        .forEach(([k, v]) => dl.append(el('dt', { texto: ETIQUETAS[k] }), el('dd', { texto: v })));
      seccion.append(el('h2', { texto: 'Lo que registramos' }), dl);

      const acciones = el('div', { clase: 'acciones-estado' });
      const corregir = el('a', { clase: 'boton', href: 'index.html#contacto', texto: 'Corregir mis datos' });
      corregir.addEventListener('click', () => {
        almacen.guardar(CLAVE_BORRADOR, { datos: sol.datos, ts: Date.now() });
        if (confirmada) { sol.estado = 'en-correccion'; almacen.guardar(CLAVE_SOLICITUD, sol); }
      });
      if (confirmada) {
        const deshacer = el('button', { type: 'button', clase: 'boton-secundario', texto: 'Deshacer confirmación' });
        deshacer.addEventListener('click', () => {
          sol.estado = 'anulada';
          sol.ts = Date.now();
          almacen.guardar(CLAVE_SOLICITUD, sol);
          almacen.guardar(CLAVE_BORRADOR, { datos: sol.datos, ts: Date.now() });
          pintar('Confirmación deshecha. Tus datos se conservaron.');
          document.getElementById('titulo-estado').focus();
        });
        acciones.append(corregir, deshacer);
      } else {
        const reconfirmar = el('button', { type: 'button', clase: 'boton', texto: 'Volver a confirmar' });
        reconfirmar.addEventListener('click', () => {
          sol.estado = 'confirmada';
          sol.ts = Date.now();
          almacen.guardar(CLAVE_SOLICITUD, sol);
          pintar('Solicitud confirmada de nuevo.');
          document.getElementById('titulo-estado').focus();
        });
        acciones.append(reconfirmar, corregir);
      }
      const borrar = el('button', { type: 'button', clase: 'boton-secundario', texto: 'Borrar mis datos de este navegador' });
      borrar.addEventListener('click', () => {
        almacen.borrar(CLAVE_SOLICITUD);
        almacen.borrar(CLAVE_BORRADOR);
        seccion.hidden = true;
        if (estatica) estatica.hidden = false;
        const t = estatica && estatica.querySelector('h1');
        if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
      });
      acciones.append(borrar);
      seccion.append(acciones);

      seccion.append(el('div', { role: 'status', 'aria-live': 'polite', clase: 'aviso-vivo', texto: mensajeVivo || '' }));
    }
    pintar('');
  }

  // ---------- 5. ARRANQUE ----------
  function arrancar() {
    const form = document.getElementById('form-contacto');
    if (form) iniciarFormulario(form);
    const estado = document.getElementById('estado-envio');
    if (estado) iniciarConfirmacion(estado);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
