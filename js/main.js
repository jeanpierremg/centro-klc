/**
 * main.js — Interacciones del sitio Centro KLC
 * Fase 5 · 2026-11-14
 *
 * Funciones:
 * 1. Header sticky con sombra al hacer scroll
 * 2. Menú hamburguesa / drawer móvil
 * 3. Marcar ítem activo en la navegación
 * 4. Envío del formulario de contacto (Formspree)
 * 5. Trampa de foco para ventanas modales (menú móvil y galería de "El centro")
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. HEADER — sombra al hacer scroll
  ------------------------------------------------------------------ */
  const header = document.querySelector('.header');

  if (header) {
    const toggleSombraHeader = () => {
      if (window.scrollY > 80) {
        header.classList.add('con-sombra');
      } else {
        header.classList.remove('con-sombra');
      }
    };

    window.addEventListener('scroll', toggleSombraHeader, { passive: true });
    toggleSombraHeader(); // ejecutar al cargar por si ya hay scroll
  }


  /* ------------------------------------------------------------------
     TRAMPA DE FOCO (usada por el menú móvil y por la galería de El centro)
     - Mientras una ventana modal está abierta, el resto de la página queda
       "inert" (no recibe foco ni clics para lectores de pantalla/teclado).
     - Tab y Shift+Tab giran dentro de la ventana, sin salir de ella.
     Se expone como window.KLC.atraparFoco(ventana) → devuelve una función
     "liberar()" que quita la trampa y devuelve el foco a quien abrió la ventana.
  ------------------------------------------------------------------ */
  const SELECTOR_FOCO = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const elementosEnfocables = (ventana) =>
    Array.from(ventana.querySelectorAll(SELECTOR_FOCO)).filter((el) => el.getClientRects().length > 0);

  // Partes de la página que se desactivan mientras hay una ventana abierta
  const fondoDePagina = (ventana) =>
    Array.from(document.body.children).filter((el) =>
      el !== ventana && !ventana.contains(el) &&
      !el.matches('script, .nav-overlay, .saltar-contenido') && !el.contains(ventana));

  window.KLC = window.KLC || {};
  window.KLC.atraparFoco = (ventana, disparador) => {
    const desactivados = fondoDePagina(ventana).filter((el) => !el.hasAttribute('inert'));
    desactivados.forEach((el) => el.setAttribute('inert', ''));
    document.body.classList.add('dialogo-abierto');

    const alTeclear = (e) => {
      if (e.key !== 'Tab') return;
      const lista = elementosEnfocables(ventana);
      if (!lista.length) { e.preventDefault(); return; }
      const primero = lista[0];
      const ultimo  = lista[lista.length - 1];
      if (!ventana.contains(document.activeElement)) {
        e.preventDefault(); primero.focus();
      } else if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primero.focus();
      }
    };
    document.addEventListener('keydown', alTeclear);

    return function liberar() {
      document.removeEventListener('keydown', alTeclear);
      desactivados.forEach((el) => el.removeAttribute('inert'));
      document.body.classList.remove('dialogo-abierto');
      if (disparador && disparador.focus) disparador.focus(); // devuelve el foco
    };
  };


  /* ------------------------------------------------------------------
     2. MENÚ HAMBURGUESA / DRAWER MÓVIL
  ------------------------------------------------------------------ */
  const hamburguesa = document.querySelector('.header__hamburguesa');
  const drawer      = document.querySelector('.nav-drawer');
  const overlay     = document.querySelector('.nav-overlay');
  const cerrarDrawer = document.querySelector('.nav-drawer__cerrar');

  let liberarFoco = null;

  const abrirMenu = () => {
    if (!drawer || !overlay || !hamburguesa) return;
    drawer.classList.add('activo');
    drawer.removeAttribute('aria-hidden');
    drawer.removeAttribute('inert');
    overlay.classList.add('activo');
    hamburguesa.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // evita scroll del fondo
    document.body.classList.add('menu-abierto'); // oculta el botón flotante de WhatsApp
    liberarFoco = window.KLC.atraparFoco(drawer, hamburguesa);
    // Foco al primer elemento del drawer
    const primerEnlace = drawer.querySelector('a, button');
    if (primerEnlace) primerEnlace.focus();
  };

  const cerrarMenu = () => {
    if (!drawer || !overlay || !hamburguesa) return;
    drawer.classList.remove('activo');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    overlay.classList.remove('activo');
    hamburguesa.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.body.classList.remove('menu-abierto');
    if (liberarFoco) { liberarFoco(); liberarFoco = null; } // quita la trampa y devuelve el foco al botón
    else hamburguesa.focus();
  };

  // Estado inicial: drawer cerrado
  if (drawer) {
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
  }

  if (hamburguesa) hamburguesa.addEventListener('click', abrirMenu);
  if (overlay)     overlay.addEventListener('click', cerrarMenu);
  if (cerrarDrawer) cerrarDrawer.addEventListener('click', cerrarMenu);

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('activo')) {
      cerrarMenu();
    }
  });

  // Cerrar el drawer al hacer clic en un enlace de navegación
  if (drawer) {
    drawer.querySelectorAll('a').forEach((enlace) => {
      enlace.addEventListener('click', cerrarMenu);
    });
  }


  /* ------------------------------------------------------------------
     3. FORMULARIO DE CONTACTO (Formspree con AJAX)
     Envía el formulario sin recargar la página.
  ------------------------------------------------------------------ */
  const formulario = document.querySelector('.formulario[data-formspree]');

  if (formulario) {
    const mensajeOk    = formulario.querySelector('.formulario__mensaje--ok');
    const mensajeError = formulario.querySelector('.formulario__mensaje--error');
    const botonEnviar  = formulario.querySelector('[type="submit"]');
    // Los mensajes viven ocultos con el atributo "hidden" y se muestran quitándolo

    /* Mensajes de validación en español */
    const mensajesValidacion = {
      nombre:   'Por favor ingresa tu nombre.',
      correo:   'Por favor ingresa un correo válido.',
      edad_hijo: 'Por favor selecciona la edad de tu hijo/a.',
      mensaje:  'Por favor escribe tu consulta.',
    };

    /* Muestra o quita el error de validación de un campo */
    const mostrarErrorCampo = (campo, mensaje) => {
      let errorEl = campo.parentElement.querySelector('.campo__error');
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'campo__error';
        errorEl.setAttribute('role', 'alert');
        campo.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = mensaje;
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', errorEl.id || (errorEl.id = `error-${campo.id}`));
    };

    const limpiarErrorCampo = (campo) => {
      const errorEl = campo.parentElement.querySelector('.campo__error');
      if (errorEl) errorEl.textContent = '';
      campo.removeAttribute('aria-invalid');
    };

    /* Validar al perder el foco */
    ['nombre', 'correo', 'edad_hijo', 'mensaje'].forEach((nombre) => {
      const campo = formulario.querySelector(`[name="${nombre}"]`);
      if (!campo) return;
      campo.addEventListener('blur', () => {
        if (!campo.value.trim() || (campo.tagName === 'SELECT' && !campo.value)) {
          mostrarErrorCampo(campo, mensajesValidacion[nombre]);
        } else if (nombre === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value)) {
          mostrarErrorCampo(campo, mensajesValidacion.correo);
        } else {
          limpiarErrorCampo(campo);
        }
      });
      campo.addEventListener('input', () => limpiarErrorCampo(campo));
    });

    /* Validar al enviar (y mover el foco al primer campo con error) */
    const validarFormulario = () => {
      let valido = true;
      let primerInvalido = null;
      ['nombre', 'correo', 'edad_hijo', 'mensaje'].forEach((nombre) => {
        const campo = formulario.querySelector(`[name="${nombre}"]`);
        if (!campo) return;
        const vacio = !campo.value.trim() || (campo.tagName === 'SELECT' && !campo.value);
        const correoInvalido = nombre === 'correo' && campo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value);
        if (vacio || correoInvalido) {
          mostrarErrorCampo(campo, mensajesValidacion[nombre]);
          valido = false;
          if (!primerInvalido) primerInvalido = campo;
        }
      });
      if (primerInvalido) primerInvalido.focus();
      return valido;
    };

    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validarFormulario()) return;

      if (mensajeOk)    mensajeOk.hidden    = true;
      if (mensajeError) mensajeError.hidden = true;

      if (botonEnviar) {
        botonEnviar.disabled = true;
        botonEnviar.textContent = 'Enviando…';
      }

      const datos = new FormData(formulario);
      const url   = formulario.getAttribute('action');

      try {
        const respuesta = await fetch(url, {
          method: 'POST',
          body: datos,
          headers: { 'Accept': 'application/json' }
        });

        if (respuesta.ok) {
          formulario.reset();
          if (mensajeOk) {
            mensajeOk.hidden = false;
            // Desplazar al mensaje
            mensajeOk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else {
          if (mensajeError) mensajeError.hidden = false;
        }
      } catch (_err) {
        if (mensajeError) mensajeError.hidden = false;
      } finally {
        if (botonEnviar) {
          botonEnviar.disabled = false;
          botonEnviar.textContent = 'Enviar consulta';
        }
      }
    });
  }

})();
