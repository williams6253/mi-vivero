const vista     = document.getElementById("vista");
const migas     = document.getElementById("migas");
const panel     = document.getElementById("panelCarrito");
const itemsDiv  = document.getElementById("itemsCarrito");
const totalSpan = document.getElementById("total");
const contador  = document.getElementById("contador");

let carrito = JSON.parse(localStorage.getItem("carritoVivero")) || [];
let variedadesVisibles = [];
let tipoActual = "";

const claseDif = { "Fácil": "facil", "Media": "media", "Avanzada": "avanzada" };

// ---------- Utilidades ----------
function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function foto(item) {
  return item.imagen_url
    ? `<img src="${esc(item.imagen_url)}" alt="${esc(item.nombre)}" loading="lazy">`
    : "🌱";
}

function tarjetaNavegacion(item, enlace) {
  return `
    <a class="card enlace" href="${enlace}">
      <div class="foto">${foto(item)}</div>
      <div class="info">
        <h3>${esc(item.nombre)}</h3>
        <p>${esc(item.descripcion)}</p>
        <span class="ver">Ver más ›</span>
      </div>
    </a>`;
}

function mostrarError(error) {
  console.error(error);
  vista.innerHTML = "<p>No se pudo cargar el catálogo. Intenta de nuevo en unos minutos.</p>";
}

// ---------- Navegación (Categoría → Tipo → Variedad) ----------
async function router() {
  window.scrollTo(0, 0);
  const [, nivel, id] = location.hash.split("/");
  if (nivel === "c") return verTipos(Number(id));
  if (nivel === "t") return verVariedades(Number(id));
  return verCategorias();
}
window.addEventListener("hashchange", router);

async function verCategorias() {
  migas.innerHTML = "";
  vista.innerHTML = "<p>Cargando...</p>";
  const { data, error } = await db.from("categorias").select("*").order("nombre");
  if (error) return mostrarError(error);
  if (!data.length) { vista.innerHTML = "<p>Pronto agregaremos nuevas plantas 🌱</p>"; return; }
  vista.innerHTML = data.map(c => tarjetaNavegacion(c, `#/c/${c.id}`)).join("");
}

async function verTipos(categoriaId) {
  vista.innerHTML = "<p>Cargando...</p>";
  const [resCat, resTipos] = await Promise.all([
    db.from("categorias").select("id, nombre").eq("id", categoriaId).single(),
    db.from("tipos").select("*").eq("categoria_id", categoriaId).order("nombre")
  ]);
  if (resCat.error || resTipos.error) return mostrarError(resCat.error || resTipos.error);

  migas.innerHTML = `<a href="#/">Inicio</a> › ${esc(resCat.data.nombre)}`;
  if (!resTipos.data.length) { vista.innerHTML = "<p>Aún no hay plantas en esta categoría.</p>"; return; }
  vista.innerHTML = resTipos.data.map(t => tarjetaNavegacion(t, `#/t/${t.id}`)).join("");
}

async function verVariedades(tipoId) {
  vista.innerHTML = "<p>Cargando...</p>";
  const [resTipo, resVar] = await Promise.all([
    db.from("tipos").select("id, nombre, categorias(id, nombre)").eq("id", tipoId).single(),
    db.from("variedades").select("*").eq("tipo_id", tipoId).order("nombre")
  ]);
  if (resTipo.error || resVar.error) return mostrarError(resTipo.error || resVar.error);

  const tipo = resTipo.data;
  tipoActual = tipo.nombre;
  variedadesVisibles = resVar.data;

  migas.innerHTML = `<a href="#/">Inicio</a> › <a href="#/c/${tipo.categorias.id}">${esc(tipo.categorias.nombre)}</a> › ${esc(tipo.nombre)}`;

  if (!variedadesVisibles.length) { vista.innerHTML = "<p>Aún no hay variedades disponibles.</p>"; return; }

  vista.innerHTML = variedadesVisibles.map(v => {
    const agotado = v.stock <= 0;
    return `
      <article class="card">
        <div class="foto">${foto(v)}</div>
        <div class="info">
          <h3>${esc(v.nombre)}</h3>
          <p>${esc(v.descripcion)}</p>
          <ul class="cuidados">
            ${v.luz ? `<li>☀️ ${esc(v.luz)}</li>` : ""}
            ${v.riego ? `<li>💧 ${esc(v.riego)}</li>` : ""}
            <li><span class="dif ${claseDif[v.dificultad] || ""}">${esc(v.dificultad)}</span></li>
          </ul>
          <p class="precio">${MONEDA} ${v.precio}</p>
          <button data-id="${v.id}" ${agotado ? "disabled" : ""}>
            ${agotado ? "Agotado" : "Agregar al carrito"}
          </button>
        </div>
      </article>`;
  }).join("");
}

vista.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (id) agregar(Number(id));
});

// ---------- Carrito ----------
function agregar(id) {
  const v = variedadesVisibles.find(x => x.id === id);
  if (!v) return;
  const existente = carrito.find(i => i.id === id);
  if (existente) {
    if (existente.cantidad >= v.stock) return alert("No hay más unidades disponibles.");
    existente.cantidad++;
  } else {
    carrito.push({
      id: v.id,
      nombre: `${tipoActual} ${v.nombre}`,
      precio: Number(v.precio),
      stock: v.stock,
      cantidad: 1
    });
  }
  guardar();
  panel.classList.add("abierto");
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  if (delta > 0 && item.cantidad >= item.stock) return alert("No hay más unidades disponibles.");
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== id);
  guardar();
}

function guardar() {
  localStorage.setItem("carritoVivero", JSON.stringify(carrito));
  pintarCarrito();
}

function pintarCarrito() {
  let total = 0, unidades = 0;
  itemsDiv.innerHTML = carrito.map(i => {
    total += i.precio * i.cantidad;
    unidades += i.cantidad;
    return `
      <div class="item">
        <div><strong>${esc(i.nombre)}</strong><br>${MONEDA} ${i.precio}</div>
        <div class="cant">
          <button data-menos="${i.id}">−</button> ${i.cantidad}
          <button data-mas="${i.id}">+</button>
        </div>
      </div>`;
  }).join("") || "<p>Tu carrito está vacío.</p>";

  totalSpan.textContent = `${MONEDA} ${total.toFixed(2)}`;
  contador.textContent = unidades;
}

itemsDiv.addEventListener("click", (e) => {
  if (e.target.dataset.mas)   cambiarCantidad(Number(e.target.dataset.mas), 1);
  if (e.target.dataset.menos) cambiarCantidad(Number(e.target.dataset.menos), -1);
});

document.getElementById("btnCarrito").onclick = () => panel.classList.add("abierto");
document.getElementById("btnCerrar").onclick  = () => panel.classList.remove("abierto");
document.getElementById("btnVaciar").onclick  = () => { carrito = []; guardar(); };

document.getElementById("btnPedir").onclick = () => {
  if (!carrito.length) return alert("Tu carrito está vacío.");
  const nombre = document.getElementById("nombreCliente").value.trim() || "Cliente";
  let total = 0;
  let texto = `Hola, soy ${nombre}. Quiero hacer este pedido:\n\n`;
  carrito.forEach(i => {
    const subtotal = i.precio * i.cantidad;
    total += subtotal;
    texto += `• ${i.cantidad} x ${i.nombre} = ${MONEDA} ${subtotal.toFixed(2)}\n`;
  });
  texto += `\nTotal: ${MONEDA} ${total.toFixed(2)}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank");
};

pintarCarrito();
router();