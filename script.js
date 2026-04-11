import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  firebaseConfig,
  MENU_ITEMS_COLLECTION,
  DEFAULT_ORDER_FIELD
} from "./firebase-config.js";

const categoriesContainer = document.getElementById("categories");
const menuList = document.getElementById("menuList");
const countEl = document.getElementById("resultsCount");
const statusText = document.getElementById("statusText");

const itemName = document.getElementById("itemName");
const itemCategory = document.getElementById("itemCategory");
const itemPrice = document.getElementById("itemPrice");
const itemSubtitle = document.getElementById("itemSubtitle");
const itemDescription = document.getElementById("itemDescription");
const itemType = document.getElementById("itemType");
const itemRarity = document.getElementById("itemRarity");
const itemMission = document.getElementById("itemMission");
const energyBar = document.getElementById("energyBar");
const sweetBar = document.getElementById("sweetBar");
const popularBar = document.getElementById("popularBar");

let menuData = [];
let currentFilter = "all";
let currentId = null;

function setStatus(message) {
  statusText.textContent = message;
}

function formatPrice(value) {
  if (typeof value === "number") {
    return "$ " + value.toLocaleString("es-AR");
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return "Consultar";
}

function normalizeCategory(rawItem) {
  const value = rawItem.categoryLabel || rawItem.category || "Sin categoría";
  return String(value).trim();
}

function normalizeType(rawItem) {
  const category = normalizeCategory(rawItem).toLowerCase();

  if (category.includes("fr")) return "Frío";
  if (category.includes("dul")) return "Dulce";
  if (category.includes("brunch") || category.includes("desay")) return "Brunch";
  if (category.includes("combo")) return "Combo";
  return "Caliente";
}

function normalizeTags(rawItem) {
  if (Array.isArray(rawItem.tags)) {
    return rawItem.tags.filter(Boolean).map(t => String(t));
  }
  return [];
}

function guessMeters(type, featured) {
  const base = {
    energy: 45,
    sweet: 40,
    popular: featured ? 92 : 70
  };

  switch (type) {
    case "Caliente":
      base.energy = 82;
      base.sweet = 24;
      break;
    case "Frío":
      base.energy = 38;
      base.sweet = 58;
      break;
    case "Dulce":
      base.energy = 20;
      base.sweet = 90;
      break;
    case "Brunch":
      base.energy = 55;
      base.sweet = 12;
      break;
    case "Combo":
      base.energy = 65;
      base.sweet = 50;
      break;
  }

  return base;
}

function mapFirestoreItem(docSnapshot) {
  const raw = docSnapshot.data();
  const type = normalizeType(raw);
  const categoryLabel = normalizeCategory(raw);
  const tags = normalizeTags(raw);
  const meters = guessMeters(type, !!raw.featured);

  return {
    id: docSnapshot.id,
    name: raw.name || "Sin nombre",
    subtitle: raw.shortDescription || raw.description || categoryLabel,
    category: categoryLabel,
    categoryKey: categoryLabel.toLowerCase().trim(),
    categoryLabel: categoryLabel.toUpperCase(),
    price: formatPrice(raw.price),
    description: raw.description || "Producto disponible en Niji Café.",
    type,
    rarity: raw.featured ? "Destacado" : (tags[0] || "Clásico"),
    mission: raw.stockMode || "Disponible",
    energy: meters.energy,
    sweet: meters.sweet,
    popular: meters.popular,
    order: typeof raw.order === "number" ? raw.order : 9999
  };
}

function updateDisplay(item) {
  itemName.textContent = item.name;
  itemCategory.textContent = item.categoryLabel;
  itemPrice.textContent = item.price;
  itemSubtitle.textContent = item.subtitle;
  itemDescription.textContent = item.description;
  itemType.textContent = item.type;
  itemRarity.textContent = capitalize(item.rarity);
  itemMission.textContent = capitalize(item.mission);
  energyBar.style.width = item.energy + "%";
  sweetBar.style.width = item.sweet + "%";
  popularBar.style.width = item.popular + "%";
  setStatus("Registro detectado: " + item.name);
}

function capitalize(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildCategories() {
  const uniqueCategories = [...new Set(menuData.map(item => item.category))];

  categoriesContainer.innerHTML = "";

  const allBtn = createCategoryButton("Todos", "all", true);
  categoriesContainer.appendChild(allBtn);

  uniqueCategories.forEach(category => {
    const button = createCategoryButton(category, category.toLowerCase().trim(), false);
    categoriesContainer.appendChild(button);
  });
}

function createCategoryButton(label, value, isActive) {
  const btn = document.createElement("button");
  btn.className = "category-btn" + (isActive ? " active" : "");
  btn.dataset.filter = value;
  btn.textContent = label;

  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = value;
    renderList();
  });

  return btn;
}

function buildRecord(item) {
  const article = document.createElement("article");
  article.className = "record";
  if (item.id === currentId) article.classList.add("active");

  article.innerHTML = `
    <div class="record-top">
      <h3>${escapeHtml(item.name)}</h3>
      <span class="record-price">${escapeHtml(item.price)}</span>
    </div>
    <p>${escapeHtml(item.subtitle)}</p>
    <div class="badges">
      <span class="badge type">${escapeHtml(item.type)}</span>
      <span class="badge rare">${escapeHtml(capitalize(item.rarity))}</span>
      <span class="badge mission">${escapeHtml(capitalize(item.mission))}</span>
    </div>
  `;

  article.addEventListener("click", () => {
    currentId = item.id;
    updateDisplay(item);
    renderList();
  });

  return article;
}

function renderList() {
  const filtered = currentFilter === "all"
    ? menuData
    : menuData.filter(item => item.categoryKey === currentFilter);

  menuList.innerHTML = "";

  if (!filtered.length) {
    countEl.textContent = "0";
    menuList.innerHTML = `<div class="empty-state">No hay productos para esta categoría.</div>`;
    return;
  }

  if (!filtered.some(item => item.id === currentId)) {
    currentId = filtered[0].id;
    updateDisplay(filtered[0]);
  }

  filtered.forEach(item => menuList.appendChild(buildRecord(item)));
  countEl.textContent = filtered.length;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadMenu() {
  try {
    validateFirebaseConfig();

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    setStatus("Consultando registros en Firestore...");

    const menuRef = collection(db, MENU_ITEMS_COLLECTION);
    const menuQuery = query(
      menuRef,
      where("active", "==", true),
      orderBy(DEFAULT_ORDER_FIELD, "asc")
    );

    const snapshot = await getDocs(menuQuery);

    menuData = snapshot.docs.map(mapFirestoreItem);

    if (!menuData.length) {
      setStatus("No se encontraron productos activos.");
      itemName.textContent = "Sin productos";
      itemCategory.textContent = "SIN DATOS";
      itemPrice.textContent = "Revisá Firestore";
      itemSubtitle.textContent = "No hay registros activos";
      itemDescription.textContent = "La colección no devolvió productos con active = true.";
      itemType.textContent = "-";
      itemRarity.textContent = "-";
      itemMission.textContent = "-";
      energyBar.style.width = "0%";
      sweetBar.style.width = "0%";
      popularBar.style.width = "0%";
      buildCategories();
      renderList();
      return;
    }

    menuData.sort((a, b) => {
      if (a.categoryKey < b.categoryKey) return -1;
      if (a.categoryKey > b.categoryKey) return 1;
      return a.order - b.order;
    });

    currentId = menuData[0].id;
    buildCategories();
    updateDisplay(menuData[0]);
    renderList();
    setStatus("Menú cargado correctamente desde Firestore.");
  } catch (error) {
    console.error(error);
    setStatus("Error al cargar Firestore.");
    itemName.textContent = "Error de conexión";
    itemCategory.textContent = "FIRESTORE";
    itemPrice.textContent = "Revisar configuración";
    itemSubtitle.textContent = "No se pudo levantar el menú";
    itemDescription.textContent = error.message || "Ocurrió un error al consultar Firestore.";
    itemType.textContent = "-";
    itemRarity.textContent = "-";
    itemMission.textContent = "-";
    energyBar.style.width = "0%";
    sweetBar.style.width = "0%";
    popularBar.style.width = "0%";
    menuList.innerHTML = `<div class="empty-state">No se pudo cargar el menú. Revisá la consola del navegador.</div>`;
    countEl.textContent = "0";
  }
}

function validateFirebaseConfig() {
  if (!firebaseConfig || firebaseConfig.apiKey === "PEGAR_API_KEY") {
    throw new Error("Falta completar firebase-config.js con la configuración real del proyecto.");
  }
}

loadMenu();
