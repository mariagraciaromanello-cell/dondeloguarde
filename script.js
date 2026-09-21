/* ========================================================
   ¿DÓNDE LO GUARDÉ? — CHISPA
   Miniapp 100% local. Sin backend, sin cuentas, sin red.
   ======================================================== */

(function () {
  'use strict';

  var CLAVE = 'chispa.donde-lo-guarde.v1';

  /* ---------- Catálogos ---------- */

  var CATEGORIAS = {
    documentos:   { emoji: '📄', nombre: 'Documentos' },
    herramientas: { emoji: '🔧', nombre: 'Herramientas' },
    electronica:  { emoji: '🔌', nombre: 'Electrónica' },
    casa:         { emoji: '🏠', nombre: 'Casa' },
    auto:         { emoji: '🚗', nombre: 'Auto' },
    ropa:         { emoji: '👕', nombre: 'Ropa' },
    decoracion:   { emoji: '🎄', nombre: 'Decoración' },
    repuestos:    { emoji: '🧰', nombre: 'Repuestos' },
    regalos:      { emoji: '🎁', nombre: 'Regalos' },
    otros:        { emoji: '📦', nombre: 'Otros' }
  };

  var LUGARES = {
    casa:     { emoji: '🏠', nombre: 'Casa' },
    auto:     { emoji: '🚗', nombre: 'Auto' },
    trabajo:  { emoji: '💼', nombre: 'Trabajo' },
    deposito: { emoji: '📦', nombre: 'Depósito' },
    otro:     { emoji: '📍', nombre: 'Otro' }
  };

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---------- Estado ---------- */

  var items = [];
  var editandoId = null;
  var detalleId = null;
  var eliminandoId = null;
  var ultimoFoco = null;
  var temporizadorToast = null;

  /* ---------- Atajos ---------- */

  function $(id) { return document.getElementById(id); }

  /* ---------- Fechas ---------- */

  function hoyISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  function esFechaISO(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    var p = valor.split('-');
    var anio = Number(p[0]), mes = Number(p[1]), dia = Number(p[2]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
    var d = new Date(anio, mes - 1, dia);
    return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia;
  }

  /* Formatea sin usar Date(string) para evitar corrimientos de zona horaria. */
  function fechaLarga(valor) {
    if (!esFechaISO(valor)) return 'Sin fecha';
    var p = valor.split('-');
    return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + ' de ' + p[0];
  }

  /* ---------- Texto ---------- */

  function normalizar(texto) {
    return String(texto == null ? '' : texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function limpiar(texto, max) {
    var t = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) : t;
  }

  function limpiarMulti(texto, max) {
    var t = String(texto == null ? '' : texto).replace(/[ \t]+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) : t;
  }

  function generarId() {
    return 'it_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  /* ---------- Datos derivados ---------- */

  function datosCategoria(clave) {
    return CATEGORIAS[clave] || null;
  }

  function datosLugar(clave) {
    return LUGARES[clave] || LUGARES.otro;
  }

  function emojiDe(item) {
    var cat = datosCategoria(item.categoria);
    return cat ? cat.emoji : '📦';
  }

  function nombreCategoria(item) {
    var cat = datosCategoria(item.categoria);
    return cat ? cat.emoji + ' ' + cat.nombre : 'Sin categoría';
  }

  function rutaDe(item) {
    var lugar = datosLugar(item.lugarPrincipal);
    var partes = [lugar.nombre];
    if (item.ubicacion) partes.push(item.ubicacion);
    return partes.join(' → ');
  }

  /* ---------- localStorage ---------- */

  function sanearItem(bruto) {
    if (!bruto || typeof bruto !== 'object') return null;
    var nombre = limpiar(bruto.nombre, 80);
    if (!nombre) return null;

    var categoria = typeof bruto.categoria === 'string' && CATEGORIAS[bruto.categoria] ? bruto.categoria : '';
    var lugar = typeof bruto.lugarPrincipal === 'string' && LUGARES[bruto.lugarPrincipal] ? bruto.lugarPrincipal : 'casa';
    var fecha = esFechaISO(bruto.fecha) ? bruto.fecha : hoyISO();
    var creado = typeof bruto.creadoEn === 'string' && bruto.creadoEn ? bruto.creadoEn : new Date().toISOString();
    var id = typeof bruto.id === 'string' && bruto.id ? bruto.id : generarId();

    return {
      id: id,
      nombre: nombre,
      categoria: categoria,
      lugarPrincipal: lugar,
      ubicacion: limpiar(bruto.ubicacion, 120),
      detalle: limpiarMulti(bruto.detalle, 400),
      fecha: fecha,
      favorito: bruto.favorito === true,
      creadoEn: creado
    };
  }

  function cargar() {
    var crudo;
    try {
      crudo = window.localStorage.getItem(CLAVE);
    } catch (e) {
      return [];
    }
    if (!crudo) return [];

    var datos;
    try {
      datos = JSON.parse(crudo);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(datos)) return [];

    var vistos = {};
    var limpios = [];
    for (var i = 0; i < datos.length; i++) {
      var item = sanearItem(datos[i]);
      if (!item) continue;
      if (vistos[item.id]) item.id = generarId();
      vistos[item.id] = true;
      limpios.push(item);
    }
    return limpios;
  }

  function persistir() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(items));
      return true;
    } catch (e) {
      mostrarToast('No pudimos guardar en este dispositivo.');
      return false;
    }
  }

  function buscarPorId(id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function porRecientes(a, b) {
    if (a.creadoEn === b.creadoEn) return 0;
    return a.creadoEn < b.creadoEn ? 1 : -1;
  }

  /* ---------- Búsqueda ---------- */

  function camposBuscables(item) {
    var cat = datosCategoria(item.categoria);
    return {
      nombre: normalizar(item.nombre),
      lugar: normalizar(datosLugar(item.lugarPrincipal).nombre + ' ' + item.ubicacion + ' ' + (cat ? cat.nombre : '')),
      detalle: normalizar(item.detalle)
    };
  }

  function buscar(consulta) {
    var tokens = normalizar(consulta).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    var encontrados = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var campos = camposBuscables(item);
      var puntaje = 0;
      var todos = true;

      for (var t = 0; t < tokens.length; t++) {
        var token = tokens[t];
        var suma = 0;
        if (campos.nombre.indexOf(token) !== -1) suma += 3;
        if (campos.lugar.indexOf(token) !== -1) suma += 2;
        if (campos.detalle.indexOf(token) !== -1) suma += 1;
        if (suma === 0) { todos = false; break; }
        puntaje += suma;
      }

      if (todos) encontrados.push({ item: item, puntaje: puntaje });
    }

    encontrados.sort(function (a, b) {
      if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
      return porRecientes(a.item, b.item);
    });

    return encontrados.map(function (r) { return r.item; });
  }

  /* ---------- Tarjetas (sin innerHTML) ---------- */

  function crearTarjeta(item) {
    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'tarjeta' + (item.favorito ? ' tarjeta-favorita' : '');
    boton.setAttribute('data-id', item.id);
    boton.setAttribute('aria-label', 'Ver detalle de ' + item.nombre);

    var emoji = document.createElement('span');
    emoji.className = 'tarjeta-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = emojiDe(item);
    boton.appendChild(emoji);

    var cuerpo = document.createElement('span');
    cuerpo.className = 'tarjeta-cuerpo';

    var nombre = document.createElement('span');
    nombre.className = 'tarjeta-nombre';
    nombre.textContent = item.nombre;
    cuerpo.appendChild(nombre);

    var ruta = document.createElement('span');
    ruta.className = 'tarjeta-ruta';
    ruta.textContent = '📍 ' + rutaDe(item);
    cuerpo.appendChild(ruta);

    if (item.detalle) {
      var detalle = document.createElement('span');
      detalle.className = 'tarjeta-detalle';
      detalle.textContent = '📝 ' + item.detalle;
      cuerpo.appendChild(detalle);
    }

    var ver = document.createElement('span');
    ver.className = 'tarjeta-ver';
    ver.textContent = 'Ver detalle';
    cuerpo.appendChild(ver);

    boton.appendChild(cuerpo);

    if (item.favorito) {
      var estrella = document.createElement('span');
      estrella.className = 'tarjeta-estrella';
      estrella.setAttribute('aria-label', 'Importante');
      estrella.textContent = '⭐';
      boton.appendChild(estrella);
    }

    return boton;
  }

  function pintarLista(contenedor, lista) {
    contenedor.textContent = '';
    var fragmento = document.createDocumentFragment();
    for (var i = 0; i < lista.length; i++) {
      fragmento.appendChild(crearTarjeta(lista[i]));
    }
    contenedor.appendChild(fragmento);
  }

  function plural(n, singular, pluralTexto) {
    return n + ' ' + (n === 1 ? singular : pluralTexto);
  }

  /* ---------- Render ---------- */

  function renderInicio() {
    var lista = items.slice().sort(porRecientes);
    pintarLista($('lista-inicio'), lista);
    $('vacio-inicio').hidden = lista.length > 0;
    $('contador-items').textContent = lista.length ? plural(lista.length, 'cosa guardada', 'cosas guardadas') : '';
  }

  function renderFavoritos() {
    var lista = items.filter(function (i) { return i.favorito; }).sort(porRecientes);
    pintarLista($('lista-favoritos'), lista);
    $('vacio-favoritos').hidden = lista.length > 0;
    $('contador-favoritos').textContent = lista.length ? plural(lista.length, 'elemento', 'elementos') : '';
  }

  function renderBusqueda() {
    var entrada = $('input-buscar');
    var consulta = entrada.value.trim();
    var hayTexto = consulta.length > 0;

    $('btn-limpiar-busqueda').hidden = !hayTexto;

    var sinDatos = items.length === 0;
    var resultados = hayTexto && !sinDatos ? buscar(consulta) : [];

    pintarLista($('lista-resultados'), resultados);

    $('vacio-busqueda-sin-datos').hidden = !sinDatos;
    $('vacio-busqueda-inicial').hidden = sinDatos || hayTexto;
    $('vacio-sin-resultados').hidden = sinDatos || !hayTexto || resultados.length > 0;

    if (!hayTexto || sinDatos) {
      $('contador-resultados').textContent = '';
    } else if (resultados.length > 0) {
      $('contador-resultados').textContent = '🔎 ' + plural(resultados.length, 'resultado encontrado', 'resultados encontrados');
    } else {
      $('contador-resultados').textContent = '';
    }
  }

  function renderTodo() {
    renderInicio();
    renderFavoritos();
    renderBusqueda();
  }

  /* ---------- Navegación ---------- */

  function irA(vista) {
    var vistas = ['inicio', 'buscar', 'favoritos'];
    for (var i = 0; i < vistas.length; i++) {
      var nombre = vistas[i];
      $('vista-' + nombre).hidden = nombre !== vista;
      var tab = $('tab-' + nombre);
      var activa = nombre === vista;
      tab.classList.toggle('tab-activa', activa);
      tab.setAttribute('aria-pressed', activa ? 'true' : 'false');
    }
    if (vista === 'buscar') {
      renderBusqueda();
      $('input-buscar').focus();
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Toast ---------- */

  function mostrarToast(mensaje) {
    var toast = $('toast');
    toast.textContent = mensaje;
    toast.hidden = false;
    if (temporizadorToast) window.clearTimeout(temporizadorToast);
    temporizadorToast = window.setTimeout(function () {
      toast.hidden = true;
    }, 2600);
  }

  /* ---------- Modales ---------- */

  function abrirModal(id, focoId) {
    if (!$(id).hidden) {
      // Ya abierto: solo mover el foco.
      if (focoId && $(focoId)) $(focoId).focus();
      return;
    }
    if (!ultimoFoco) ultimoFoco = document.activeElement;
    $(id).hidden = false;
    document.body.style.overflow = 'hidden';
    if (focoId && $(focoId)) {
      $(focoId).focus();
    }
  }

  function cerrarModal(id) {
    $(id).hidden = true;
    if (id === 'modal-form') editandoId = null;
    if (id === 'modal-detalle') detalleId = null;
    if (id === 'modal-eliminar') eliminandoId = null;

    if (hayModalAbierto()) {
      if (id === 'modal-eliminar' && !$('modal-detalle').hidden) $('btn-eliminar').focus();
      return;
    }
    document.body.style.overflow = '';
    if (ultimoFoco && document.body.contains(ultimoFoco)) {
      ultimoFoco.focus();
    }
    ultimoFoco = null;
  }

  function hayModalAbierto() {
    return !$('modal-form').hidden || !$('modal-detalle').hidden || !$('modal-eliminar').hidden;
  }

  function modalSuperior() {
    if (!$('modal-eliminar').hidden) return 'modal-eliminar';
    if (!$('modal-form').hidden) return 'modal-form';
    if (!$('modal-detalle').hidden) return 'modal-detalle';
    return null;
  }

  /* ---------- Formulario ---------- */

  function limpiarError() {
    $('error-nombre').hidden = true;
    $('campo-nombre').classList.remove('campo-error');
  }

  function abrirFormNuevo() {
    editandoId = null;
    $('titulo-form').textContent = '＋ Guardar algo';
    $('btn-guardar-form').textContent = 'Guardar';
    $('campo-nombre').value = '';
    $('campo-categoria').value = '';
    $('campo-lugar').value = 'casa';
    $('campo-ubicacion').value = '';
    $('campo-detalle').value = '';
    $('campo-fecha').value = hoyISO();
    $('campo-favorito').checked = false;
    limpiarError();
    abrirModal('modal-form', 'campo-nombre');
  }

  function abrirFormEdicion(item) {
    editandoId = item.id;
    $('titulo-form').textContent = '✏️ Editar';
    $('btn-guardar-form').textContent = 'Guardar cambios';
    $('campo-nombre').value = item.nombre;
    $('campo-categoria').value = item.categoria;
    $('campo-lugar').value = item.lugarPrincipal;
    $('campo-ubicacion').value = item.ubicacion;
    $('campo-detalle').value = item.detalle;
    $('campo-fecha').value = esFechaISO(item.fecha) ? item.fecha : hoyISO();
    $('campo-favorito').checked = item.favorito === true;
    limpiarError();
    abrirModal('modal-form', 'campo-nombre');
  }

  function enviarForm(evento) {
    evento.preventDefault();

    var nombre = limpiar($('campo-nombre').value, 80);
    if (!nombre) {
      $('error-nombre').hidden = false;
      $('campo-nombre').classList.add('campo-error');
      $('campo-nombre').focus();
      return;
    }
    limpiarError();

    var fecha = $('campo-fecha').value;
    if (!esFechaISO(fecha)) fecha = hoyISO();

    var datos = {
      nombre: nombre,
      categoria: CATEGORIAS[$('campo-categoria').value] ? $('campo-categoria').value : '',
      lugarPrincipal: LUGARES[$('campo-lugar').value] ? $('campo-lugar').value : 'casa',
      ubicacion: limpiar($('campo-ubicacion').value, 120),
      detalle: limpiarMulti($('campo-detalle').value, 400),
      fecha: fecha,
      favorito: $('campo-favorito').checked === true
    };

    var mensaje;
    if (editandoId) {
      var actual = buscarPorId(editandoId);
      if (!actual) {
        cerrarModal('modal-form');
        mostrarToast('Ese elemento ya no está.');
        return;
      }
      actual.nombre = datos.nombre;
      actual.categoria = datos.categoria;
      actual.lugarPrincipal = datos.lugarPrincipal;
      actual.ubicacion = datos.ubicacion;
      actual.detalle = datos.detalle;
      actual.fecha = datos.fecha;
      actual.favorito = datos.favorito;
      detalleId = actual.id;
      mensaje = '✏️ Cambios guardados.';
    } else {
      datos.id = generarId();
      datos.creadoEn = new Date().toISOString();
      items.push(datos);
      mensaje = '📦 Guardado. Ahora sí vas a saber dónde está.';
    }

    persistir();
    var veniaDeDetalle = editandoId && !$('modal-detalle').hidden;
    cerrarModal('modal-form');
    renderTodo();

    if (veniaDeDetalle && detalleId) {
      pintarDetalle(buscarPorId(detalleId));
    }
    mostrarToast(mensaje);
  }

  /* ---------- Detalle ---------- */

  function pintarDetalle(item) {
    if (!item) return;
    detalleId = item.id;
    $('detalle-nombre').textContent = emojiDe(item) + ' ' + item.nombre;
    $('detalle-categoria').textContent = nombreCategoria(item);
    $('detalle-ubicacion').textContent = rutaDe(item);
    $('detalle-detalle').textContent = item.detalle ? item.detalle : 'Sin detalle.';
    $('detalle-fecha').textContent = fechaLarga(item.fecha);
    $('detalle-favorito').textContent = item.favorito ? 'Sí' : 'No';
    $('btn-favorito').textContent = item.favorito ? '☆ Quitar de importantes' : '⭐ Marcar como importante';
  }

  function abrirDetalle(id) {
    var item = buscarPorId(id);
    if (!item) {
      mostrarToast('Ese elemento ya no está.');
      renderTodo();
      return;
    }
    pintarDetalle(item);
    abrirModal('modal-detalle', 'btn-editar');
  }

  function alternarFavorito() {
    var item = buscarPorId(detalleId);
    if (!item) return;
    item.favorito = !item.favorito;
    persistir();
    pintarDetalle(item);
    renderTodo();
    mostrarToast(item.favorito ? '⭐ Marcado como importante.' : '☆ Ya no es importante.');
  }

  /* ---------- Eliminar ---------- */

  function pedirEliminar() {
    var item = buscarPorId(detalleId);
    if (!item) return;
    eliminandoId = item.id;
    $('pregunta-eliminar').textContent = '¿Querés eliminar “' + item.nombre + '”?';
    abrirModal('modal-eliminar', 'btn-confirmar-eliminar');
  }

  function confirmarEliminar() {
    var id = eliminandoId;
    if (!id) return;
    var quedan = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].id !== id) quedan.push(items[i]);
    }
    items = quedan;
    persistir();

    cerrarModal('modal-eliminar');
    if (!$('modal-detalle').hidden) cerrarModal('modal-detalle');
    renderTodo();
    mostrarToast('🗑️ Eliminado.');
  }

  /* ---------- Eventos ---------- */

  function conectarEventos() {
    // Tabs
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        irA(this.getAttribute('data-vista'));
      });
    }

    // Acciones principales
    $('btn-ir-buscar').addEventListener('click', function () { irA('buscar'); });
    $('btn-ir-guardar').addEventListener('click', abrirFormNuevo);
    $('btn-primera-cosa').addEventListener('click', abrirFormNuevo);
    $('btn-guardar-desde-busqueda').addEventListener('click', abrirFormNuevo);
    $('btn-fab').addEventListener('click', abrirFormNuevo);

    // Búsqueda en vivo
    $('input-buscar').addEventListener('input', renderBusqueda);
    $('input-buscar').addEventListener('search', renderBusqueda);
    $('btn-limpiar-busqueda').addEventListener('click', function () {
      $('input-buscar').value = '';
      renderBusqueda();
      $('input-buscar').focus();
    });

    // Tarjetas (delegación)
    ['lista-inicio', 'lista-favoritos', 'lista-resultados'].forEach(function (id) {
      $(id).addEventListener('click', function (evento) {
        var tarjeta = evento.target.closest('.tarjeta');
        if (!tarjeta) return;
        abrirDetalle(tarjeta.getAttribute('data-id'));
      });
    });

    // Formulario
    $('form-item').addEventListener('submit', enviarForm);
    $('campo-nombre').addEventListener('input', function () {
      if (!$('error-nombre').hidden && this.value.trim()) limpiarError();
    });

    // Ficha
    $('btn-editar').addEventListener('click', function () {
      var item = buscarPorId(detalleId);
      if (item) abrirFormEdicion(item);
    });
    $('btn-favorito').addEventListener('click', alternarFavorito);
    $('btn-eliminar').addEventListener('click', pedirEliminar);
    $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);

    // Cierre de modales
    var cierres = document.querySelectorAll('[data-cerrar]');
    for (var c = 0; c < cierres.length; c++) {
      cierres[c].addEventListener('click', function () {
        cerrarModal(this.getAttribute('data-cerrar'));
      });
    }

    // Teclado
    document.addEventListener('keydown', function (evento) {
      if (evento.key !== 'Escape') return;
      var arriba = modalSuperior();
      if (arriba) {
        evento.preventDefault();
        cerrarModal(arriba);
      }
    });
  }

  /* ---------- Arranque ---------- */

  function iniciar() {
    try {
      items = cargar();
    } catch (e) {
      items = [];
    }
    conectarEventos();
    $('campo-fecha').value = hoyISO();
    renderTodo();
    irA('inicio');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
