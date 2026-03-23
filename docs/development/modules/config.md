# Especificación de UI: Pantalla "Configuraciones"

## 1. Información General
- **Contexto:** Panel de configuración de usuario para aplicación.
- **Layout:** Sidebar lateral izquierdo (navegación) + Panel de contenido principal (derecha).

## 2. Paleta de Colores 
- **Heredada del estilo de la aplicaciones:**.

## 3. Estructura del Sidebar (Navegación Lateral)
El sidebar se organiza en secciones con títulos en mayúsculas (Label) y elementos de lista (Ítems).

### Sección: CUENTA
- **Mi cuenta:** [Estado Activo] Icono de usuario.
- **Mi plan:** Icono de trofeo.
- **Zona de peligro:** Icono de alerta/triángulo.

### Sección: PREFERENCIAS
- **Apariencia:** Icono de paleta de colores.
- **Idioma:** Icono de documento/texto.
- **Regional:** Icono de globo terráqueo.
- **Dashboard:** Icono de gráfico de barras.

### Alertas:
- **Alertas:** Icono de campana.

## 4. Contenido Principal (Vista "Mi Cuenta")
La sección principal tiene un padding amplio y los elementos están centrados o alineados a la izquierda en una columna.

## 5. Requerimientos Funcionales para la IA
- **Responsividad:** El sidebar debe colapsar en dispositivos móviles.
- **Estado 'Active':** El componente de navegación debe recibir una clase de CSS para resaltar el ítem donde se encuentra el usuario.
- **Accesibilidad:** Uso de etiquetas semánticas (nav, main, section, h2, label).