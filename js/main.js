/**
 * main.js — Interacciones del sitio Centro KLC
 * Fase 5 · 2026-11-14
 *
 * Funciones:
 * 1. Header sticky con sombra al hacer scroll
 * 2. Menú hamburguesa / drawer móvil
 * 3. Marcar ítem activo en la navegación
 * 4. Envío del formulario de contacto (Formspree)
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
     2. MENÚ HAMBURGUESA / DRAWER MÓVIL
  ------------------------------------------------------------------ */
  const hamburguesa = document.querySelector('.header__hamburguesa');
  const drawer      = document.querySelector('.nav-drawer');
  const overlay     = document.querySelector('.nav-overlay');
  const cerrarDrawer = document.querySelector('.nav-drawer__cerrar');

  const abrirMenu = () => {
    if (!drawer || !overlay || !hamburguesa) return;
    drawer.classList.add('activo');
    drawer.removeAttribute('aria-hidden');
    drawer.removeAttribute('inert');
    overlay.classList.add('activo');
    hamburguesa.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // evita scroll del fondo
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
    hamburguesa.focus(); // devuelve el foco al botón
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

    /* Validar al enviar */
    const validarFormulario = () => {
      let valido = true;
      ['nombre', 'correo', 'edad_hijo', 'mensaje'].forEach((nombre) => {
        const campo = formulario.querySelector(`[name="${nombre}"]`);
        if (!campo) return;
        const vacio = !campo.value.trim() || (campo.tagName === 'SELECT' && !campo.value);
        const correoInvalido = nombre === 'correo' && campo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value);
        if (vacio || correoInvalido) {
          mostrarErrorCampo(campo, mensajesValidacion[nombre]);
          valido = false;
        }
      });
      return valido;
    };

    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validarFormulario()) return;

      if (mensajeOk)    mensajeOk.style.display    = 'none';
      if (mensajeError) mensajeError.style.display  = 'none';

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
          if (mensajeOk) mensajeOk.style.display = 'block';
          // Desplazar al mensaje
          mensajeOk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          if (mensajeError) mensajeError.style.display = 'block';
        }
      } catch (_err) {
        if (mensajeError) mensajeError.style.display = 'block';
      } finally {
        if (botonEnviar) {
          botonEnviar.disabled = false;
          botonEnviar.textContent = 'Enviar consulta';
        }
      }
    });
  }

})();
