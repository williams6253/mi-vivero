// ====== CONFIGURACIÓN (edita esto) ======
const WHATSAPP = "51910388012";   // código de país + número, sin + ni espacios. Ej: 51999999999
const MONEDA   = "S/";
// ========================================

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let categoriaActiva = "Todas";

const catalogo   = document.getElementById("catalogo");
const filtros    = document.getElementById("filtros");
const panel      = document.getElementById("panelCarrito");
const itemsDiv   = document.getElementById("itemsCarrito");
const totalSpan  = document.getElementById("total");
const contador   = document.getElementById("contador");

// ---------- Cargar productos ----------
async function iniciar() {
  try {
    const resp = await fetch("data/productos.json");
    productos = await resp.json();
    pintarFiltros();
    pintarCatalogo();
    pintarCarrito();
  } catch (e) {
    catalogo.innerHTML = "<p>No se pudo cargar el catálogo.</p>";
    console.error(e);
  }
}

// ---------- Filtros por categoría ----------
function pintarFiltros() {
  const categorias = ["Todas", ...new Set(productos.map(p => p.categoria))];
  filtros.innerHTML = categorias
    .map(c => `<button class="${c === categoriaActiva ? "activo" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
}

filtros.addEventListener("click", (e) => {
  if (e.target.dataset.cat) {
    categoriaActiva = e.target.dataset.cat;
    pintarFiltros();
    pintarCatalogo();
  }
});

// ---------- Catálogo ----------
function pintarCatalogo() {
  const lista = categoriaActiva === "Todas"
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  catalogo.innerHTML = lista.map(p => `
    <article class="card">
      <div class="foto">
        ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" loading="lazy">` : p.icono}
      </div>
      <div class="info">
        <span class="cat">${p.categoria}</span>
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
        <p class="precio">${MONEDA} ${p.precio}</p>
        <button data-id="${p.id}">Agregar al carrito</button>
      </div>
    </article>
  `).join("");
}

catalogo.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (id) agregar(Number(id));
});

// ---------- Carrito ----------
function agregar(id) {
  const existente = carrito.find(i => i.id === id);
  if (existente) existente.cantidad++;
  else carrito.push({ id, cantidad: 1 });
  guardar();
  panel.classList.add("abierto");
}

function cambiarCantidad(id, delta) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== id);
  guardar();
}

function guardar() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
  pintarCarrito();
}

function pintarCarrito() {
  let total = 0;
  let unidades = 0;

  itemsDiv.innerHTML = carrito.map(i => {
    const p = productos.find(x => x.id === i.id);
    if (!p) return "";
    total += p.precio * i.cantidad;
    unidades += i.cantidad;
    return `
      <div class="item">
        <div><strong>${p.nombre}</strong><br>${MONEDA} ${p.precio}</div>
        <div class="cant">
          <button data-menos="${p.id}">−</button>
          ${i.cantidad}
          <button data-mas="${p.id}">+</button>
        </div>
      </div>`;
  }).join("") || "<p>Tu carrito está vacío.</p>";

  totalSpan.textContent = total;
  contador.textContent = unidades;
}

itemsDiv.addEventListener("click", (e) => {
  if (e.target.dataset.mas)   cambiarCantidad(Number(e.target.dataset.mas), 1);
  if (e.target.dataset.menos) cambiarCantidad(Number(e.target.dataset.menos), -1);
});

document.getElementById("btnCarrito").onclick = () => panel.classList.add("abierto");
document.getElementById("btnCerrar").onclick  = () => panel.classList.remove("abierto");
document.getElementById("btnVaciar").onclick  = () => { carrito = []; guardar(); };

// ---------- Pedido por WhatsApp ----------
document.getElementById("btnPedir").onclick = () => {
  if (carrito.length === 0) return alert("Tu carrito está vacío.");

  const nombre = document.getElementById("nombreCliente").value.trim() || "Cliente";
  let total = 0;
  let texto = `Hola, soy ${nombre}. Quiero hacer este pedido:\n\n`;

  carrito.forEach(i => {
    const p = productos.find(x => x.id === i.id);
    const subtotal = p.precio * i.cantidad;
    total += subtotal;
    texto += `• ${i.cantidad} x ${p.nombre} = ${MONEDA} ${subtotal}\n`;
  });

  texto += `\nTotal: ${MONEDA} ${total}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank");
};

iniciar();