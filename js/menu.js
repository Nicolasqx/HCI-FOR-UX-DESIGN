// 1. SELECCIÓN DE ELEMENTOS DEL DOM
const botonMenu = document.querySelector('#boton-menu');
const navegacion = document.querySelector('#navegacion');
const textoMenu = document.querySelector('#texto-menu');
const submenu = document.querySelector('#resolver');

// 2. DETECCIÓN DE PANTALLA MÓVIL (Misma media query del CSS)
const pantallaMovil = window.matchMedia('(max-width: 600px)');

// 3. FUNCIÓN DE CONTROL DE ESTADOS DE NAVEGACIÓN
function cambiarMenu(abrir) {
  navegacion.hidden = pantallaMovil.matches && !abrir;
  botonMenu.setAttribute('aria-expanded', String(abrir));
  botonMenu.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  textoMenu.textContent = abrir ? 'Cerrar' : 'Menú';

  // Al cerrar el menú principal, se cierra también el submenú desplegable
  if (!abrir && submenu) {
    submenu.open = false;
  }
}

// 4. EVENTO CLICK EN EL BOTÓN HAMBURGUESA
botonMenu.addEventListener('click', function () {
  const estaAbierto = botonMenu.getAttribute('aria-expanded') === 'true';
  cambiarMenu(!estaAbierto);
});

// 5. EVENTO CLICK EN LOS ENLACES DE NAVEGACIÓN
navegacion.addEventListener('click', function (evento) {
  const enlace = evento.target.closest('a');
  if (!enlace) return;

  cambiarMenu(false);

  // Mover el foco accesible hacia la sección de destino
  const ruta = enlace.getAttribute('href');
  const destino = ruta.startsWith('#') ? document.querySelector(ruta) : null;
  if (destino) {
    destino.focus({ preventScroll: true });
  }
});

// 6. EVENTO CLICK EN EL LOGOTIPO (Retorno al Inicio)
const marca = document.querySelector('.marca');
if (marca) {
  marca.addEventListener('click', function () {
    cambiarMenu(false);
    const inicio = document.querySelector('#inicio');
    if (inicio) inicio.focus({ preventScroll: true });
  });
}

// 7. TECLA ESCAPE PARA CERRAR NAVEGACIÓN O SUBMENÚ
document.addEventListener('keydown', function (evento) {
  if (evento.key !== 'Escape') return;

  if (pantallaMovil.matches && !navegacion.hidden) {
    cambiarMenu(false);
    botonMenu.focus();
  } else if (submenu && submenu.open) {
    submenu.open = false;
    const summary = submenu.querySelector('summary');
    if (summary) summary.focus();
  }
});

// 8. ADAPTACIÓN AL CAMBIAR DE TAMAÑO DE PANTALLA
function ajustarPantalla() {
  const focoEstabaEnNavegacion = navegacion.contains(document.activeElement);
  const focoEstabaEnBoton = document.activeElement === botonMenu;
  cambiarMenu(false);

  if (pantallaMovil.matches && focoEstabaEnNavegacion) {
    botonMenu.focus();
  } else if (!pantallaMovil.matches && focoEstabaEnBoton) {
    const primerEnlace = navegacion.querySelector('a');
    if (primerEnlace) primerEnlace.focus();
  }
}
pantallaMovil.addEventListener('change', ajustarPantalla);

// Estado inicial al cargar el documento
ajustarPantalla();


