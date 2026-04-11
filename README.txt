NIJIDEX + FIRESTORE

Contenido:
- index.html
- styles.css
- script.js
- firebase-config.js
- README.txt

Cómo usarlo:
1. Descomprimí el zip.
2. Abrí firebase-config.js
3. Pegá tu configuración web real de Firebase.
4. Si tu colección no se llama menuItems, cambiá MENU_ITEMS_COLLECTION.
5. Abrí index.html desde un servidor local.

Importante:
Este proyecto usa módulos JS de Firebase, así que NO conviene abrirlo con doble clic.
Levantalo con servidor local.

Opciones rápidas:
- VS Code + Live Server
- python -m http.server 5500
- npx serve

Consulta actual:
- Lee solo productos con active == true
- Ordena por el campo "order"
- No modifica tu base de datos

Campos que usa del documento:
- active
- name
- description
- shortDescription (si existe)
- category o categoryLabel
- price
- featured
- tags
- stockMode
- order

Notas:
- Si price es número, lo formatea como moneda argentina.
- Si price es texto, lo muestra tal cual.
- Si faltan tags o description, usa valores por defecto.
