# 🅿️ UPARQUEO - Sistema de Gestión de Parqueaderos (Pro Version)

**UPARQUEO by ChrizDev** es una plataforma integral de alto rendimiento diseñada para la gestión total de parqueaderos y zonas comerciales. Esta versión modernizada incluye herramientas avanzadas de auditoría, control de personal y seguridad de datos.

![Estado del Proyecto](https://img.shields.io/badge/Estado-Produccion-green)
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

---

## 🚀 Nuevas Características (Fase 3)

### 👥 Gestión de Personal y Roles
* **Control de Empleados:** Módulo administrativo para crear, editar y supervisar cuentas de staff.
* **Roles de Acceso:** Distinción entre `Admin` (Acceso total) y `Empleado` (Solo operativo).

### 💬 Mensajería Interna Profesional
* **Chat por Hilos:** Comunicación organizada por temas entre el staff y la administración.
* **Estado de Solución:** Los administradores pueden marcar casos como "Solucionados", archivándolos en un registro histórico de auditoría.

### 📸 Evidencias y Auditoría
* **Registro Fotográfico:** Capacidad de asociar fotos y notas técnicas a cada vehículo para evitar reclamos por daños previos.
* **Historial Detallado:** Trazabilidad completa de quién registró cada acción y en qué momento.

### 📊 Reportes e Inteligencia de Negocio
* **Exportación Profesional:** Generación de reportes financieros y operativos en formato **PDF** y **Excel (XLSX)**.
* **Filtros Temporales:** Análisis de ingresos diarios, semanales y mensuales.

### 🛡️ Auditoría Avanzada y Trazabilidad (Novedad)
* **Historial de Novedades:** Registro inmutable (caja negra) de cada transacción importante (abonos, pagos, creación de negocios, suspensiones).
* **Atribución Precisa:** Cada acción queda guardada con la fecha, hora exacta y el *username* del empleado o administrador que la ejecutó.
* **Buscador Dinámico:** Interfaz dedicada en reportes para buscar rápidamente cualquier novedad por nombre de negocio, usuario o tipo de acción.

### 💾 Seguridad y Portabilidad
* **Modo Desarrollador (Gestión Master):** Panel protegido para mantenimiento técnico y gestión granular de permisos de empleados según el módulo.
* **Backups JSON Dinámicos:** Exportación e Importación de toda la base de datos (incluyendo históricos de auditoría) en un solo archivo para respaldos.
* **Protocolo de Reinicio:** Eliminación selectiva o global de datos operativos garantizando un restablecimiento seguro del sistema.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React.js + Vite + Framer Motion (Animaciones).
* **Iconografía:** Lucide Icons.
* **Backend:** Supabase (PostgreSQL) con suscripciones en tiempo real.
* **Documentación:** jsPDF (PDF) y SheetJS (Excel).

---

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/ChrizDev07/uparqueo-by-chrizdev.git
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz y agrega tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_aqui
   VITE_SUPABASE_ANON_KEY=tu_key_aqui
   ```

4. **Ejecutar:**
   ```bash
   npm run dev
   ```

---

## 📐 Estructura de la Base de Datos

* **admins:** Gestión de perfiles y roles (admin/empleado).
* **registros_parqueadero:** Historial de vehículos y cobros.
* **negocios_informales:** Seguimiento de puestos y deudas.
* **historial_pagos_informales:** Registro de todos los abonos realizados.
* **historial_auditoria:** Caja negra de acciones y transacciones de los usuarios.
* **mensajes:** Sistema de hilos de comunicación interna.
* **evidencias:** Almacenamiento de pruebas fotográficas y notas.
* **configuracion:** Parámetros globales y tarifas.

---

## 👤 Autor
**Chris (ChrizDev)** - Desarrollador FullStack apasionado por crear herramientas que transforman la gestión operativa en experiencias digitales premium.

Desarrollado con ❤️ para una gestión de parqueo eficiente y moderna.
