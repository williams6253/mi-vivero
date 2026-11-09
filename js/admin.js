const loginBox  = document.getElementById("login");
const panel     = document.getElementById("panel");
const btnSalir  = document.getElementById("btnSalir");
const migas     = document.getElementById("migas");
const titulo    = document.getElementById("titulo");
const ayuda     = document.getElementById("ayuda");
const formulario = document.getElementById("formulario");
const lista     = document.getElementById("lista");

// Campos de cada nivel. Para agregar uno nuevo, primero crea la columna en Supabase.
const CAMPOS = {
  categorias: [
    { n: "nombre", etiqueta: "Nombre", tipo: "text", req: true },
    { n: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
  ],
  tipos: [
    { n: "nombre", etiqueta: "Nombre", tipo: "text", req: true },
    { n: "descripcion", etiqueta: "Descripción", tipo: "textarea" }
  ],
  variedades: [
    { n: "nombre", etiqueta: "Nombre", tipo: "text", req: true },
    { n: "descripcion", etiqueta: "Descripción", tipo: "textarea" },
    { n: "precio", etiqueta: "Precio", tipo: "number", defecto: 0 },
    { n: "stock", etiqueta: "Stock (unidades)", tipo: "number", defecto: 0 },
    { n: "luz", etiqueta: "Luz (ej. Sol directo)", tipo: "text" },
    { n: "riego", etiqueta: "Riego (ej. Bandeja con 1–2 cm de agua)", tipo: "text" },
    { n: "dificultad", etiqueta: "Dificultad", tipo: "select",
      opciones: ["Fácil", "Media", "Avanzada"], defecto: "Media" },
    { n: "visible", etiqueta: "Visible en la tienda", tipo: "checkbox" }
  ]
};
const SINGULAR = { categorias: "categoría", tipos: "tipo", variedades: "variedad" };

let ruta = { cat: null, tipo: null };   // dónde estamos navegando
let registros = [];                     // lo que se muestra en la lista
let editando = null;                    // registro que se está editando

const nivelActual = () => !ruta.cat ? "categorias" : !ruta.tipo ? "tipos" : "variedades";

function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Sesión ----------
async function iniciar() {
  const { data } = await db.auth.getSession();
  data.session ? mostrarPanel() : mostrarLogin();
}

function mostrarLogin() {
  loginBox.classList.remove("oculto");
  panel.classList.add("oculto");
  btnSalir.classList.add("oculto");
}

function mostrarPanel() {
  loginBox.classList.add("oculto");
  panel.classList.remove("oculto");
  btnSalir.classList.remove("oculto");
  ruta = { cat: null, tipo: null };
  cargar();
}

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("msgLogin").textContent = "Correo o contraseña incorrectos.";
    return;
  }
  mostrarPanel();
});

btnSalir.onclick = async () => { await db.auth.signOut(); mostrarLogin(); };

// ---------- Cargar datos ----------
async function cargar() {
  const nv = nivelActual();
  pintarMigas();

  if (nv === "categorias") {
    titulo.textContent = "Categorías";
    ayuda.textContent = "Crea las categorías principales de tu tienda. Ej.: Carnívoras, Suculentas, Cactus.";
  } else if (nv === "tipos") {
    titulo.textContent = `Tipos dentro de «${ruta.cat.nombre}»`;
    ayuda.textContent = "Agrega los tipos de esta categoría. Ej.: Venus, Sarracenias, Droseras.";
  } else {
    titulo.textContent = `Variedades de «${ruta.tipo.nombre}»`;
    ayuda.textContent = "Agrega cada variedad con su precio y stock. Ej.: B52, Dentate, GJ Montecore.";
  }

  let consulta = db.from(nv).select("*").order("nombre");
  if (nv === "tipos") consulta = consulta.eq("categoria_id", ruta.cat.id);
  if (nv === "variedades") consulta = consulta.eq("tipo_id", ruta.tipo.id);

  const { data, error } = await consulta;
  if (error) { lista.innerHTML = `<p class="error">Error: ${esc(error.message)}</p>`; return; }

  registros = data;
  pintarFormulario(null);
  pintarLista();
}

function pintarMigas() {
  let html = `<a href="#" data-ir="inicio">Categorías</a>`;
  if (ruta.cat)  html += ` › <a href="#" data-ir="cat">${esc(ruta.cat.nombre)}</a>`;
  if (ruta.tipo) html += ` › <strong>${esc(ruta.tipo.nombre)}</strong>`;
  migas.innerHTML = html;
}

migas.addEventListener("click", (e) => {
  const ir = e.target.dataset.ir;
  if (!ir) return;
  e.preventDefault();
  if (ir === "inicio") ruta = { cat: null, tipo: null };
  if (ir === "cat") ruta.tipo = null;
  cargar();
});

// ---------- Formulario ----------
function pintarFormulario(reg) {
  editando = reg;
  const nv = nivelActual();
  const v = reg || {};

  const campos = CAMPOS[nv].map(c => {
    const valor = v[c.n] ?? c.defecto ?? "";
    if (c.tipo === "textarea")
      return `<label>${c.etiqueta}<textarea name="${c.n}" rows="2">${esc(valor)}</textarea></label>`;
    if (c.tipo === "select")
      return `<label>${c.etiqueta}<select name="${c.n}">${
        c.opciones.map(o => `<option ${o === valor ? "selected" : ""}>${o}</option>`).join("")
      }</select></label>`;
    if (c.tipo === "checkbox")
      return `<label class="check"><input type="checkbox" name="${c.n}" ${(reg ? v[c.n] : true) ? "checked" : ""}> ${c.etiqueta}</label>`;
    return `<label>${c.etiqueta}<input type="${c.tipo}" name="${c.n}" value="${esc(valor)}"
      ${c.req ? "required" : ""} ${c.tipo === "number" ? 'min="0" step="any"' : ""}></label>`;
  }).join("");

  formulario.innerHTML = `
    <h3>${reg ? "Editar" : "Agregar"} ${SINGULAR[nv]}</h3>
    ${campos}
    <label>Foto (opcional)<input type="file" name="foto" accept="image/*"></label>
    ${reg && reg.imagen_url ? `<img class="mini" src="${esc(reg.imagen_url)}" alt="">` : ""}
    <div class="acciones">
      <button type="submit">${reg ? "Guardar cambios" : "Agregar"}</button>
      ${reg ? '<button type="button" id="btnCancelar" class="btn-secundario">Cancelar</button>' : ""}
    </div>
    <p id="msgForm" class="error"></p>`;
}

formulario.addEventListener("click", (e) => {
  if (e.target.id === "btnCancelar") pintarFormulario(null);
});

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nv = nivelActual();
  const fd = new FormData(formulario);
  const msg = document.getElementById("msgForm");

  const registro = {};
  CAMPOS[nv].forEach(c => {
    if (c.tipo === "checkbox") registro[c.n] = formulario.elements[c.n].checked;
    else if (c.tipo === "number") registro[c.n] = Number(fd.get(c.n) || 0);
    else registro[c.n] = (fd.get(c.n) || "").trim();
  });

  msg.textContent = "Guardando...";

  const foto = fd.get("foto");
  if (foto && foto.size > 0) {
    const url = await subirFoto(foto);
    if (!url) { msg.textContent = "No se pudo subir la foto."; return; }
    registro.imagen_url = url;
  }

  if (nv === "tipos") registro.categoria_id = ruta.cat.id;
  if (nv === "variedades") registro.tipo_id = ruta.tipo.id;

  const { error } = editando
    ? await db.from(nv).update(registro).eq("id", editando.id)
    : await db.from(nv).insert(registro);

  if (error) { msg.textContent = "Error: " + error.message; return; }
  cargar();
});

// ---------- Fotos (se reducen antes de subir para ahorrar espacio) ----------
function reducirImagen(archivo, max = 1000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(resolve, "image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(archivo);
  });
}

async function subirFoto(archivo) {
  const blob = await reducirImagen(archivo);
  if (!blob) return null;
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db.storage.from("imagenes").upload(nombre, blob, { contentType: "image/jpeg" });
  if (error) { console.error(error); return null; }
  return db.storage.from("imagenes").getPublicUrl(nombre).data.publicUrl;
}

// ---------- Lista ----------
function pintarLista() {
  const nv = nivelActual();
  if (!registros.length) {
    lista.innerHTML = `<p>Aún no hay nada aquí. Agrega el primero con el formulario de arriba.</p>`;
    return;
  }
  lista.innerHTML = registros.map(d => `
    <div class="fila">
      ${d.imagen_url ? `<img class="mini" src="${esc(d.imagen_url)}" alt="">` : '<span class="mini">🌱</span>'}
      <div class="fila-info">
        <strong>${esc(d.nombre)}</strong>
        ${nv === "variedades"
          ? `<br><small>${MONEDA} ${d.precio} · Stock: ${d.stock}${d.visible ? "" : " · 🙈 Oculta"}</small>`
          : ""}
      </div>
      <div class="fila-botones">
        ${nv !== "variedades" ? `<button data-abrir="${d.id}">Abrir ›</button>` : ""}
        <button data-editar="${d.id}" class="btn-secundario">Editar</button>
        <button data-borrar="${d.id}" class="btn-peligro">Borrar</button>
      </div>
    </div>`).join("");
}

lista.addEventListener("click", async (e) => {
  const nv = nivelActual();
  const { abrir, editar, borrar } = e.target.dataset;

  if (abrir) {
    const reg = registros.find(d => d.id == abrir);
    if (nv === "categorias") ruta.cat = { id: reg.id, nombre: reg.nombre };
    else ruta.tipo = { id: reg.id, nombre: reg.nombre };
    cargar();
  }

  if (editar) {
    pintarFormulario(registros.find(d => d.id == editar));
    formulario.scrollIntoView({ behavior: "smooth" });
  }

  if (borrar) {
    const reg = registros.find(d => d.id == borrar);
    const aviso = nv === "variedades" ? "" : "\n\n⚠️ También se borrará todo lo que contiene.";
    if (!confirm(`¿Borrar «${reg.nombre}»?${aviso}`)) return;
    const { error } = await db.from(nv).delete().eq("id", reg.id);
    if (error) alert("Error: " + error.message);
    cargar();
  }
});

iniciar();