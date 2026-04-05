# 🅿️ UPARQUEO - Sistema de Gestión de Parqueaderos

**UPARQUEO by ChrizDev** es una plataforma integral diseñada para optimizar el control de ingresos, salidas y cobros en parqueaderos y zonas comerciales. 

![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo-green)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## 📸 Vistas Previas del Sistema

### Gestión de Parqueadero
Control de vehículos activos, filtrado por placa y tipos (Carros/Motos).
![Gestión de Parqueadero](./Screenshots/Pantalla%20de%20Gestion%20de%20Parqueadero.png)

### Registro de Entradas y Cobros
Interfaz optimizada para el ingreso rápido de vehículos y cálculo automático de tarifas.
<p align="center">
  <img src="./Screenshots/Confirmacion%20de%20cobro%20por%20tiempo.png" width="45%" />
  <img src="./Screenshots/Pantalla%20de%20Gestion%20de%20Parqueadero.png" width="45%" />
</p>

### Módulo de Negocios Informales
Seguimiento de deudas, abonos y días de actividad para locales comerciales.
![Negocios Informales](./Screenshots/Pantall%20de%20gestion%20de%20negocios%20informarles%20qu...png)

### Configuración Global
Panel para la parametrización de tarifas de forma dinámica.
![Ajustes](./Screenshots/pantalla%20de%20ajustes.png)

---

## 🚀 Características Principales

* **Control de Flujo:** Registro de entrada y salida con cálculo de tiempo real.
* **Gestión de Cartera:** Módulo especializado para negocios informales con registro de abonos y deudas pendientes.
* **Historial Completo:** Registro detallado de todos los movimientos con opción de exportación.
* **Diseño Responsivo:** Interfaz adaptada para dispositivos móviles con menú inteligente.
* **Personalización:** Ajuste de tarifas globales para diferentes tipos de vehículos desde el panel de ajustes.

## 🛠️ Stack Tecnológico

* **Frontend:** React.js + Vite.
* **Estilos:** CSS3 Moderno (Flexbox & Grid) + Lucide Icons.
* **Backend:** Supabase (PostgreSQL) para datos en tiempo real.

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/ChrizDev07/uparqueo-by-chrizdev.git](https://github.com/ChrizDev07/uparqueo-by-chrizdev.git)

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
