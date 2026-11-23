(function () {
  const CLAVE = 'climatetrace-interes';
  const NOMBRES = {
    limpieza: 'cuidar tu barrio',
    organizacion: 'ordenar un espacio',
    datos: 'entender datos del clima'
  };

  const chips = document.querySelectorAll('[data-rec-interes]');
  const lista = document.querySelector('[data-rec-lista]');
  const aviso = document.querySelector('#rec-aviso');
  if (!lista) return;
  const items = Array.from(lista.querySelectorAll('[data-rec-tema]'));
  const ordenOriginal = items.slice();
  function leerInteres() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardarInteres(valor) {
    try {
      if (valor) localStorage.setItem(CLAVE, valor);
      else localStorage.removeItem(CLAVE);
    } catch (e) {}
  }

  function aplicar(interes) {
    if (!NOMBRES[interes]) interes = null;

    chips.forEach(function (chip) {
      if (!chip.classList.contains('rec-chip')) return;
      const activo = chip.dataset.recInteres === (interes || 'todo');
      chip.setAttribute('aria-pressed', String(activo));
    });

    items.forEach(function (item) {
      const temas = item.dataset.recTema.split(' ');
      const coincide = Boolean(interes) && temas.includes(interes);
      const esGeneral = temas.includes('general');
      item.classList.toggle('rec-destacado', coincide);
      item.classList.toggle('rec-atenuado', Boolean(interes) && !coincide && !esGeneral);
      const insignia = item.querySelector('.rec-insignia');
      if (insignia) insignia.hidden = !coincide;
    });

    const nuevoOrden = interes
      ? ordenOriginal.filter(function (i) { return i.classList.contains('rec-destacado'); })
          .concat(ordenOriginal.filter(function (i) { return !i.classList.contains('rec-destacado'); }))
      : ordenOriginal;
    nuevoOrden.forEach(function (item) { lista.appendChild(item); });

    if (aviso) {
      aviso.hidden = !interes;
      const motivo = aviso.querySelector('.rec-motivo');
      if (motivo && interes) motivo.textContent = NOMBRES[interes];
    }

    guardarInteres(interes);
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const valor = chip.dataset.recInteres;
      aplicar(valor === 'todo' ? null : valor);
      if (valor === 'todo') {
        const verTodo = document.querySelector('.rec-chip-todo');
        if (verTodo && chip !== verTodo) verTodo.focus();
      }
    });
  });

  document.querySelectorAll('.rec-ver').forEach(function (boton) {
    const panel = document.getElementById(boton.getAttribute('aria-controls'));
    if (!panel) return;
    boton.addEventListener('click', function () {
      const abrir = boton.getAttribute('aria-expanded') !== 'true';
      boton.setAttribute('aria-expanded', String(abrir));
      boton.textContent = abrir ? 'Ocultar vista previa' : 'Vista previa';
      panel.hidden = !abrir;
    });
  });

  aplicar(leerInteres());
})();
