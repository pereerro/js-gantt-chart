# GanttChart.js

[](https://opensource.org/licenses/MIT)
[](https://www.google.com/search?q=https://github.com/TU_USUARIO/js-gantt-chart)

Un componente de gráfico de Gantt interactivo, ligero y sin dependencias, creado con JavaScript puro. Diseñado para ser fácil de integrar y personalizar en cualquier proyecto web.

![image](https://github.com/user-attachments/assets/40b44254-fe9b-40b9-a4bc-6620ecb7fe71)


-----

## ✨ Características Principales

  * **JavaScript Puro:** Sin dependencias de librerías externas como jQuery, React o Vue.
  * **Interactividad:** Zoom con la rueda del ratón (Ctrl + Rueda) y scroll para navegar en el tiempo.
  * **Tooltips Informativos:** Muestra detalles de cada tarea al pasar el ratón por encima.
  * **Visualización de Previsiones:**
      * Muestra visualmente si una tarea terminará antes de lo planificado (`Fuera de plazo`) o después (`En plazo`).
      * El estilo de la previsión (contorno discontinuo) deja claro que es una estimación.
  * **Dependencias entre Tareas:** Dibuja líneas que conectan tareas dependientes entre sí.
  * **Marcadores Visuales:** Incluye un marcador para el día actual y para eventos clave.
  * **Personalizable:** Fácil de adaptar a través de un objeto de configuración y colores por tarea.

## 🚀 Demo en Vivo

Puedes ver el componente en acción en esta demo interactiva:

**[Ver la demo en vivo](https://www.google.com/search?q=https://pereerro.github.io/js-gantt-chart/)**

## 🛠️ Cómo Empezar

Integrar el gráfico en tu proyecto es muy sencillo.

### Paso 1: HTML

Asegúrate de tener los contenedores necesarios en tu fichero HTML. El `wrapper` permite el scroll y el `tooltip` es necesario para la información emergente.

```html
<div id="gantt-container-wrapper">
    <div id="gantt-chart-container"></div>
</div>

<div id="tooltip"></div>
```

### Paso 2: CSS

Enlaza el fichero `style.css` para aplicar los estilos básicos al gráfico.

```html
<link rel="stylesheet" href="style.css">
```

### Paso 3: JavaScript

Crea una instancia de la clase `GanttChart`, pasándole tus datos y el ID del contenedor.

```html
<script src="gantt.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        // 1. Define tus tareas y eventos
        const misTareas = [
            { id: 'T1', name: 'Diseño de la interfaz', start: '2025-08-05', end: '2025-08-15', forecast_end: '2025-08-12', color: '#8B4513' },
            { id: 'T2', name: 'Desarrollo del Frontend', start: '2025-08-16', end: '2025-08-30', forecast_end: '2025-09-05', color: '#A0522D', dependencies: ['T1'] },
            { id: 'T3', name: 'Desarrollo del Backend', start: '2025-08-16', end: '2025-09-10', color: '#D2B48C', dependencies: ['T1'] }
        ];

        const misEventos = [
            { name: 'Lanzamiento Beta', date: '2025-09-08' }
        ];

        // 2. Crea la instancia del gráfico
        new GanttChart(misTareas, misEventos, 'gantt-chart-container');
    });
</script>
```

## 📊 Estructura de Datos

El componente espera dos arrays de objetos: `tasks` y `events`.

### Objeto `Task`

Cada objeto en el array de tareas debe tener la siguiente estructura:

| Propiedad        | Tipo     | Obligatorio | Descripción                                                               |
| ---------------- | -------- | ----------- | ------------------------------------------------------------------------- |
| `id`             | `String` | **Sí** | Identificador único para la tarea.                                        |
| `name`           | `String` | **Sí** | El nombre de la tarea que se mostrará en el tooltip.                      |
| `start`          | `String` | **Sí** | Fecha de inicio en formato `AAAA-MM-DD`.                                  |
| `end`            | `String` | **Sí** | Fecha de fin planificada en formato `AAAA-MM-DD`.                         |
| `forecast_end`   | `String` | No          | Fecha de fin prevista. Usada para comparar con `end`.                     |
| `color`          | `String` | No          | Color de la barra en formato HEX (ej. `#8B4513`).                         |
| `dependencies`   | `Array`  | No          | Un array de `id` de las tareas de las que depende esta.                   |

### Objeto `Event`

Cada objeto en el array de eventos marca una fecha clave en el gráfico.

| Propiedad | Tipo     | Obligatorio | Descripción                                               |
| --------- | -------- | ----------- | --------------------------------------------------------- |
| `name`    | `String` | **Sí** | Nombre del evento que se mostrará en el tooltip.          |
| `date`    | `String` | **Sí** | La fecha del evento en formato `AAAA-MM-DD`.              |

## ⚙️ Opciones de Configuración

Puedes personalizar algunos aspectos visuales del gráfico pasando un objeto de configuración. De momento, está definido dentro de la clase, pero se puede externalizar fácilmente.

| Propiedad             | Descripción                                                 | Valor por Defecto |
| --------------------- | ----------------------------------------------------------- | ----------------- |
| `padding`             | Margen interior del gráfico SVG.                            | `20`              |
| `rowHeightBase`       | Altura de cada fila de tarea (antes del zoom).              | `20`              |
| `barHeightBase`       | Altura de cada barra de tarea (antes del zoom).             | `15`              |
| `headerHeight`        | Altura de la cabecera donde se muestran las semanas.        | `20`              |
| `focusPeriodInDays`   | Horizonte de días a futuro para el enfoque del zoom inicial.| `15`              |

## 📜 Licencia

Este proyecto está distribuido bajo la Licencia MIT. Esto significa que puedes usar, copiar, modificar e incluso vender el código con muy pocas restricciones.

[Ver el texto completo de la licencia](https://www.google.com/search?q=LICENSE)

-----
## Agraïments

Este código ha estado desarrollado con la asistencia de Gemini, un modelo de lenguaje de Google.
