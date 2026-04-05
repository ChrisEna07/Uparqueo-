# 🅿️ UPARQUEO - Sistema de Gestión de Parqueaderos

**UPARQUEO by ChrizDev** es una solución web moderna diseñada para optimizar el control de ingresos, salidas y cobros en parqueaderos. El sistema permite gestionar vehículos estándar (carros y motos) y puestos de negocios informales con cálculos de deuda automatizados.

![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo-green)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🚀 Características Principales

* **Gestión de Parqueadero (P):** Registro rápido de entrada por placa, cálculo automático de tiempo y valor por hora/fracción.
* **Módulo de Informales (I):** Control de negocios (ej. puestos de comida) con seguimiento de días transcurridos, abonos y ajustes manuales de días.
* **Configuración Global (A):** Panel para actualizar tarifas de carros, motos y negocios informales en tiempo real directamente en la base de datos.
* **Historial Detallado:** Registro completo de transacciones finalizadas con filtros por placa y tipo de vehículo.
* **Diseño Full Responsivo:** Interfaz adaptada para PC y dispositivos móviles con menú hamburguesa inteligente.

## 🛠️ Stack Tecnológico

* **Frontend:** React.js con Vite.
* **Estilos:** CSS3 Moderno / Tailwind CSS (Layouts flexibles y modo oscuro).
* **Backend & DB:** Supabase (PostgreSQL) para persistencia de datos en tiempo real.
* **Iconografía:** Lucide-React.

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/uparqueo.git](https://github.com/tu-usuario/uparqueo.git)
   cd uparqueo

   Instalar dependencias:

   npm install

   Variables de Entorno:
Crea un archivo .env en la raíz y agrega tus credenciales de Supabase:

VITE_SUPABASE_URL=tu_url_aqui
VITE_SUPABASE_ANON_KEY=tu_key_aqui

Ejecutar en modo desarrollo:
npm run dev

📐 Estructura de la Base de Datos
El sistema utiliza tres tablas principales en Supabase:

vehiculos: Control de activos e historial (placa, tipo, fecha_ingreso, etc).

negocios_informales: Seguimiento de puestos (nombre, dueño, abonos, dias_manuales).

configuracion: Parámetros globales de precios por tipo de vehículo.

📸 Vista Previa
Escritorio: Interfaz amplia con visualización de ganancias potenciales y contadores en tiempo real.

Móvil: Navbar optimizado que oculta etiquetas para priorizar el espacio de trabajo.

👤 Autor
Chris (ChrizDev) - Desarrollador FullStack apasionado por crear herramientas funcionales y estéticas.

Desarrollado con ❤️ para una gestión de parqueo eficiente.
