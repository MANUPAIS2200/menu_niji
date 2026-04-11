// Pegá acá TU configuración web de Firebase.
// La encontrás en:
// Configuración del proyecto > General > Tus apps > SDK setup and configuration

export const firebaseConfig = {
  apiKey: "PEGAR_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Si tu colección tiene otro nombre, cambiá esto.
export const MENU_ITEMS_COLLECTION = "menuItems";

// Si querés ordenar por otro campo, podés cambiarlo.
export const DEFAULT_ORDER_FIELD = "order";
