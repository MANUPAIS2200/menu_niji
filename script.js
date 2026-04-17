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
  MENU_CATEGORIES_COLLECTION,
  MENU_TAGS_COLLECTION,
  DEFAULT_ORDER_FIELD
} from "./firebase-config.js";

const desktopCategories = document.getElementById("desktopCategories");
const mobileCategories = document.getElementById("mobileCategories");

const desktopMenuList = document.getElementById("desktopMenuList");
const mobileMenuList = document.getElementById("mobileMenuList");

const countEl = document.getElementById("resultsCount");
const mobileCountEl = document.getElementById("mobileResultsCount");
const statusText = document.getElementById("statusText");

const itemName = document.getElementById("itemName");
const itemCategory = document.getElementById("itemCategory");
const itemPrice = document.getElementById("itemPrice");
const itemSubtitle = document.getElementById("itemSubtitle");
const itemDescription = document.getElementById("itemDescription");
const itemType = document.getElementById("itemType");
const itemRarity = document.getElementById("itemRarity");
const itemMission = document.getElementById("itemMission");
const itemImage = document.getElementById("itemImage");
const itemImagePlaceholder = document.getElementById("itemImagePlaceholder");
const energyBar = document.getElementById("energyBar");
const sweetBar = document.getElementById("sweetBar");
const popularBar = document.getElementById("popularBar");

const openMenuBtn = document.getElementById("openMenuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const bottomSheet = document.getElementById("bottomSheet");
const mobileOverlay = document.getElementById("mobileOverlay");

let menuData = [];
let categoriesData = [];
let tagsData = [];
let currentFilter = "all";
let currentId = null;

function setStatus(message) {
  statusText.textContent = message;
}

function isMobile() {
  return window.innerWidth <= 768;
}

function openSheet() {
  bottomSheet.classList.add("active");
  mobileOverlay.classList.add("active");
  bottomSheet.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSheet() {
  bottomSheet.classList.remove("active");
  mobileOverlay.classList.remove("active");
  bottomSheet.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

openMenuBtn.addEventListener("click", openSheet);
closeMenuBtn.addEventListener("click", closeSheet);
mobileOverlay.addEventListener("click", closeSheet);

function validateFirebaseConfig() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "PEGAR_API_KEY") {
    throw new Error("Completá la configuración de Firebase en firebase-config.js.");
  }
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

function capitalize(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mapCategory(docSnapshot) {
  const raw = docSnapshot.data();
  return {
    id: String(docSnapshot.id).trim(),
    label: raw.label || docSnapshot.id,
    active: !!raw.active,
    order: typeof raw.order === "number" ? raw.order : 9999
  };
}

function mapTag(docSnapshot) {
  const raw = docSnapshot.data();
  return {
    id: String(docSnapshot.id).trim(),
    label: raw.label || docSnapshot.id,
    active: !!raw.active,
    order: typeof raw.order === "number" ? raw.order : 9999
  };
}

function getCategoryLabelById(categoryId, fallbackLabel) {
  if (!categoryId) return fallbackLabel || "Sin categoría";

  const found = categoriesData.find(
    cat => String(cat.id).trim() === String(categoryId).trim()
  );

  return found?.label || fallbackLabel || "Sin categoría";
}

function getTagLabels(tagIds) {
  if (!Array.isArray(tagIds) || !tagIds.length) return [];

  return tagIds
    .map(tagId => {
      const found = tagsData.find(
        tag => String(tag.id).trim() === String(tagId).trim()
      );
      return found?.label || null;
    })
    .filter(Boolean);
}

function guessMeters(categoryLabel, featured) {
  const normalized = String(categoryLabel || "").toLowerCase();

  const base = {
    energy: 45,
    sweet: 40,
    popular: featured ? 92 : 70
  };

  if (normalized.includes("bebida")) {
    base.energy = 82;
    base.sweet = 24;
  } else if (normalized.includes("dulce")) {
    base.energy = 20;
    base.sweet = 90;
  } else if (normalized.includes("desay") || normalized.includes("brunch")) {
    base.energy = 55;
    base.sweet = 18;
  } else if (normalized.includes("combo")) {
    base.energy = 65;
    base.sweet = 50;
  }

  return base;
}

function mapFirestoreItem(docSnapshot) {
  const raw = docSnapshot.data();

  const categoryLabel = getCategoryLabelById(
    raw.categoryId,
    raw.categoryLabel || raw.category
  );

  const tagLabels = getTagLabels(raw.tags);
  const meters = guessMeters(categoryLabel, !!raw.featured);

  return {
    id: docSnapshot.id,
    active: !!raw.active,
    name: raw.name || "Sin nombre",
    subtitle: raw.shortDescription || raw.description || categoryLabel,
    category: categoryLabel,
    categoryKey: String(categoryLabel || "").toLowerCase().trim(),
    categoryId: raw.categoryId ? String(raw.categoryId).trim() : "",
    categoryLabel: String(categoryLabel || "Sin categoría").toUpperCase(),
    price: formatPrice(raw.price),
    description: raw.description || "Producto disponible en Niji Café.",
    imageUrl: raw.imageUrl || "",
    type: categoryLabel || "Sin categoría",
    rarity: tagLabels.length ? tagLabels.join(", ") : "Sin tags",
    mission: raw.active ? "Disponible" : "No disponible",
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
  itemRarity.textContent = item.rarity;
  itemMission.textContent = item.mission;
  energyBar.style.width = item.energy + "%";
  sweetBar.style.width = item.sweet + "%";
  popularBar.style.width = item.popular + "%";

  if (item.imageUrl) {
    itemImage.src = item.imageUrl;
    itemImage.classList.remove("hidden");
    itemImagePlaceholder.classList.add("hidden");
  } else {
    itemImage.removeAttribute("src");
    itemImage.classList.add("hidden");
    itemImagePlaceholder.classList.remove("hidden");
  }

  setStatus("Registro detectado: " + item.name);
}

function createCategoryButton(label, value, isActive) {
  const btn = document.createElement("button");
  btn.className = "category-btn" + (isActive ? " active" : "");
  btn.dataset.filter = value;
  btn.textContent = label;

  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach(x => x.classList.remove("active"));
    document.querySelectorAll('.category-btn[data-filter="' + value + '"]').forEach(x => {
      x.classList.add("active");
    });
    currentFilter = value;
    renderList();
  });

  return btn;
}

function buildCategories() {
  desktopCategories.innerHTML = "";
  mobileCategories.innerHTML = "";

  desktopCategories.appendChild(createCategoryButton("Todos", "all", currentFilter === "all"));
  mobileCategories.appendChild(createCategoryButton("Todos", "all", currentFilter === "all"));

  let categoriesToRender = [];

  if (categoriesData.length) {
    categoriesToRender = categoriesData
      .filter(cat => cat.active)
      .map(cat => ({
        id: String(cat.id).trim(),
        label: cat.label
      }))
      .filter(cat =>
        menuData.some(item =>
          item.categoryId === cat.id || item.categoryKey === cat.id.toLowerCase()
        )
      );
  } else {
    const seen = new Set();
    menuData.forEach(item => {
      const key = item.categoryId || item.categoryKey;
      if (!seen.has(key)) {
        seen.add(key);
        categoriesToRender.push({
          id: key,
          label: item.category
        });
      }
    });
  }

  categoriesToRender.forEach(category => {
    const value = String(category.id).toLowerCase().trim();
    desktopCategories.appendChild(createCategoryButton(category.label, value, currentFilter === value));
    mobileCategories.appendChild(createCategoryButton(category.label, value, currentFilter === value));
  });
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
      <span class="badge rare">${escapeHtml(item.rarity)}</span>
      <span class="badge mission">${escapeHtml(item.mission)}</span>
    </div>
  `;

  article.addEventListener("click", () => {
    currentId = item.id;
    updateDisplay(item);
    renderList();

    if (isMobile()) {
      closeSheet();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  return article;
}

function getFilteredItems() {
  if (currentFilter === "all") return menuData;

  return menuData.filter(item => {
    return (
      item.categoryKey === currentFilter ||
      item.categoryId.toLowerCase() === currentFilter
    );
  });
}

function renderList() {
  const filtered = getFilteredItems();

  desktopMenuList.innerHTML = "";
  mobileMenuList.innerHTML = "";

  if (!filtered.length) {
    countEl.textContent = "0";
    mobileCountEl.textContent = "0";
    const emptyHtml = '<div class="empty-state">No hay productos para esta categoría.</div>';
    desktopMenuList.innerHTML = emptyHtml;
    mobileMenuList.innerHTML = emptyHtml;
    return;
  }

  if (!filtered.some(item => item.id === currentId)) {
    currentId = filtered[0].id;
    updateDisplay(filtered[0]);
  }

  filtered.forEach(item => {
    desktopMenuList.appendChild(buildRecord(item));
    mobileMenuList.appendChild(buildRecord(item));
  });

  countEl.textContent = String(filtered.length);
  mobileCountEl.textContent = String(filtered.length);
}

async function loadCategories(db) {
  try {
    const categoriesRef = collection(db, MENU_CATEGORIES_COLLECTION);
    const categoriesQuery = query(
      categoriesRef,
      where("active", "==", true),
      orderBy(DEFAULT_ORDER_FIELD, "asc")
    );

    const snapshot = await getDocs(categoriesQuery);
    categoriesData = snapshot.docs.map(mapCategory);
  } catch (error) {
    console.warn("No se pudieron cargar las categorías. Se usarán las de los productos.", error);
    categoriesData = [];
  }
}

async function loadTags(db) {
  try {
    const tagsRef = collection(db, MENU_TAGS_COLLECTION);
    const tagsQuery = query(
      tagsRef,
      where("active", "==", true),
      orderBy(DEFAULT_ORDER_FIELD, "asc")
    );

    const snapshot = await getDocs(tagsQuery);
    tagsData = snapshot.docs.map(mapTag);
  } catch (error) {
    console.warn("No se pudieron cargar los tags.", error);
    tagsData = [];
  }
}

async function loadMenu() {
  try {
    validateFirebaseConfig();

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    setStatus("Consultando registros en Firestore...");

    await loadCategories(db);
    await loadTags(db);

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
      itemImage.classList.add("hidden");
      itemImagePlaceholder.classList.remove("hidden");
      energyBar.style.width = "0%";
      sweetBar.style.width = "0%";
      popularBar.style.width = "0%";
      buildCategories();
      renderList();
      return;
    }

    menuData.sort((a, b) => {
      const aCat = a.categoryId || a.categoryKey;
      const bCat = b.categoryId || b.categoryKey;
      if (aCat < bCat) return -1;
      if (aCat > bCat) return 1;
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
    itemImage.classList.add("hidden");
    itemImagePlaceholder.classList.remove("hidden");
    energyBar.style.width = "0%";
    sweetBar.style.width = "0%";
    popularBar.style.width = "0%";

    desktopMenuList.innerHTML = '<div class="empty-state">No se pudo cargar el menú. Revisá la consola del navegador.</div>';
    mobileMenuList.innerHTML = '<div class="empty-state">No se pudo cargar el menú. Revisá la consola del navegador.</div>';
    countEl.textContent = "0";
    mobileCountEl.textContent = "0";
  }
}

loadMenu();