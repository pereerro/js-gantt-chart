class GanttChart {
    constructor(tasks, events, containerId) {
        this.tasks = tasks;
        this.events = events;
        this.chartContainer = document.getElementById(containerId);
        this.scrollWrapper = this.chartContainer.parentElement;
        this.tooltip = document.getElementById('tooltip');
        this.taskMap = new Map(tasks.map(t => [t.id, t]));
        this.svgNS = "http://www.w3.org/2000/svg";

        this.config = {
            padding: 20,
            rowHeightBase: 20,
            barHeightBase: 15,
            headerHeight: 20,
            zoomMin: 0.2,
            zoomMax: 5,
            dayWidthBase: 2,
            minLabelSpacingPixels: 80,
            focusPeriodInDays: 15,
        };

        this.viewState = { zoomX: 1, zoomY: 1 };
        this.init();
    }

    init() {
        this.setupDates();
        this.calculateFitZoom();
        this.render();
        this.attachEventListeners();
    }

    setupDates() {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const allDates = [
            ...this.tasks.flatMap(t => {
                const dates = [this.parseDate(t.start), this.parseDate(t.end)];
                if (t.forecast_end) dates.push(this.parseDate(t.forecast_end));
                return dates;
            }),
            ...this.events.map(e => this.parseDate(e.date))
        ];
        this.totalStartDate = new Date(Math.min(...allDates));
        this.totalEndDate = new Date(Math.max(...allDates, today));

        const startDayTotal = this.totalStartDate.getUTCDay();
        this.totalStartDate.setUTCDate(this.totalStartDate.getUTCDate() - (startDayTotal === 0 ? 6 : startDayTotal - 1) - 7);
        const endDayTotal = this.totalEndDate.getUTCDay();
        this.totalEndDate.setUTCDate(this.totalEndDate.getUTCDate() + (endDayTotal === 0 ? 0 : 7 - endDayTotal) + 7);
        this.totalDays = this.diffDays(this.totalStartDate, this.totalEndDate);

        const focusEndDate = new Date(today);
        focusEndDate.setDate(today.getDate() + this.config.focusPeriodInDays);
        const coreDates = this.tasks.flatMap(t => [this.parseDate(t.start), this.parseDate(t.end)]);
        this.viewingStartDate = new Date(Math.min(...coreDates, today));
        this.viewingEndDate = new Date(Math.max(...coreDates, focusEndDate));
        
        const startDayView = this.viewingStartDate.getUTCDay();
        this.viewingStartDate.setUTCDate(this.viewingStartDate.getUTCDate() - (startDayView === 0 ? 6 : startDayView - 1) - 7);
        const endDayView = this.viewingEndDate.getUTCDay();
        this.viewingEndDate.setUTCDate(this.viewingEndDate.getUTCDate() + (endDayView === 0 ? 0 : 7 - endDayView) + 7);
    }

    calculateFitZoom() {
        const containerWidth = this.scrollWrapper.clientWidth;
        const containerHeight = this.scrollWrapper.clientHeight;
        if (containerWidth <= 0 || containerHeight <= 0) {
            this.viewState.zoomX = 1; this.viewState.zoomY = 1; return;
        }
        
        const unzoomedViewingWidth = this.diffDays(this.viewingStartDate, this.viewingEndDate) * this.config.dayWidthBase;
        if (unzoomedViewingWidth > 0) {
            this.viewState.zoomX = Math.max(this.config.zoomMin, (containerWidth - this.config.padding * 2) / unzoomedViewingWidth);
        } else {
            this.viewState.zoomX = 1;
        }

        const unzoomedChartHeight = (this.tasks.length * this.config.rowHeightBase) + this.config.headerHeight;
        if (unzoomedChartHeight > 0) {
            this.viewState.zoomY = Math.max(this.config.zoomMin, (containerHeight - this.config.padding * 2) / unzoomedChartHeight);
        }
    }

    render() {
        this.chartContainer.innerHTML = '';
        this.dayWidth = this.config.dayWidthBase * this.viewState.zoomX;
        this.rowHeight = this.config.rowHeightBase * this.viewState.zoomY;
        this.barHeight = this.config.barHeightBase * this.viewState.zoomY;

        const chartWidth = this.totalDays * this.dayWidth + this.config.padding * 2;
        const chartHeight = this.tasks.length * this.rowHeight + this.config.headerHeight + this.config.padding * 2;

        const svg = this.createSVGElement('svg', { width: chartWidth, height: chartHeight, class: 'gantt-chart' });
        this.createDefs(svg);
        const mainGroup = this.createSVGElement('g', { transform: `translate(${this.config.padding}, ${this.config.padding})` });
        svg.appendChild(mainGroup);

        this.renderGridAndHeader(mainGroup, chartHeight);
        this.renderTasks(mainGroup);
        this.renderDependencies(mainGroup);
        this.renderTodayMarker(mainGroup, chartHeight);
        this.renderEventMarkers(mainGroup, chartHeight);

        this.chartContainer.appendChild(svg);
        
        const viewingStartOffset = this.diffDays(this.totalStartDate, this.viewingStartDate) * this.dayWidth;
        this.scrollWrapper.scrollLeft = Math.max(0, viewingStartOffset - 50);
    }

    createDefs(svg) {
        const defs = this.createSVGElement('defs');
        
        const marker = this.createSVGElement('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: '10', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
        const path = this.createSVGElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#e53e3e' });
        marker.appendChild(path);
        defs.appendChild(marker);

        const darkPattern = this.createSVGElement('pattern', { id: 'darker-pattern', patternUnits: 'userSpaceOnUse', width: '6', height: '6', patternTransform: 'rotate(45)' });
        const darkPath = this.createSVGElement('path', { d: 'M 0,0 L 0,6', style: 'stroke:rgba(0,0,0,0.9); stroke-width:6' });
        darkPattern.appendChild(darkPath);
        defs.appendChild(darkPattern);

        svg.appendChild(defs);
    }

    renderGridAndHeader(parent, chartHeight) {
        const gridGroup = this.createSVGElement('g');
        let lastLabelX = -Infinity;

        for (let day = 0; day <= this.totalDays; day++) {
            const currentDate = new Date(this.totalStartDate);
            currentDate.setUTCDate(this.totalStartDate.getUTCDate() + day);

            if (currentDate.getUTCDay() === 1) { // Es un lunes
                const x = day * this.dayWidth;
                const line = this.createSVGElement('line', { x1: x, y1: this.config.headerHeight, x2: x, y2: chartHeight - this.config.padding * 2, class: 'grid-line' });
                gridGroup.appendChild(line);

                if ((x - lastLabelX) >= this.config.minLabelSpacingPixels) {
                    const weekLabel = this.createSVGElement('text', { x: x + 4, y: this.config.headerHeight - 5, 'text-anchor': 'start', class: 'grid-header' });
                    const weekNumber = String(this.getWeekNumber(currentDate)).padStart(2, '0');
                    weekLabel.textContent = `s${weekNumber}`;
                    gridGroup.appendChild(weekLabel);
                    lastLabelX = x;
                }
            }
        }
        parent.appendChild(gridGroup);
    }
    
    renderTasks(parent) {
        const tasksGroup = this.createSVGElement('g');
        this.tasks.forEach((task, index) => {
            const taskY = this.config.headerHeight + index * this.rowHeight;
            const barY = taskY + (this.rowHeight - this.barHeight) / 2;
            const taskColor = task.color || '#3182ce';

            const startDate = this.parseDate(task.start);
            const endDate = this.parseDate(task.end);
            const forecastEndDate = task.forecast_end ? this.parseDate(task.forecast_end) : null;
            
            const taskGroup = this.createSVGElement('g', { 'data-task-id': task.id, class: 'task-group' });

            const x_start = this.diffDays(this.totalStartDate, startDate) * this.dayWidth;
            const x_end = (this.diffDays(this.totalStartDate, endDate) + 1) * this.dayWidth;
            const x_forecast_end = forecastEndDate ? (this.diffDays(this.totalStartDate, forecastEndDate) + 1) * this.dayWidth : null;

            if (!x_forecast_end || x_forecast_end === x_end) {
                // Caso 1: Barra única
                const bar = this.createSVGElement('rect', {
                    x: x_start, y: barY,
                    width: x_end - x_start, height: this.barHeight,
                    rx: 3, ry: 3, fill: taskColor, class: 'task-bar'
                });
                taskGroup.appendChild(bar);
            } else if (x_forecast_end < x_end) {
                // Caso 2: Previsión "fuera de plazo" (termina antes de lo planificado)
                const normalBarSimple = this.createSVGElement('path', {
                    d: `M ${x_start+3},${barY} L ${x_forecast_end},${barY} L ${x_forecast_end},${barY+this.barHeight} L ${x_start+3},${barY+this.barHeight} a 3 3 0 0 1 -3 -3 L ${x_start},${barY+3} a 3 3 0 0 1 3 -3 z`,
                    fill: taskColor,
                    class: 'task-bar'
                });
                taskGroup.appendChild(normalBarSimple);

                const darkBar = this.createSVGElement('path', {
                    d: `M ${x_forecast_end},${barY} L ${x_end-3},${barY} a 3 3 0 0 1 3 3 L ${x_end},${barY+this.barHeight-3} a 3 3 0 0 1 -3 3 L ${x_forecast_end},${barY+this.barHeight} z`,
                    fill: taskColor,
                    class: 'task-bar task-bar-darkened-base'
                });
                const darkOverlay = this.createSVGElement('path', {
                    d: `M ${x_forecast_end},${barY} L ${x_end-3},${barY} a 3 3 0 0 1 3 3 L ${x_end},${barY+this.barHeight-3} a 3 3 0 0 1 -3 3 L ${x_forecast_end},${barY+this.barHeight} z`,
                    fill: 'url(#darker-pattern)',
                    class: 'task-overlay-dark'
                });
                taskGroup.appendChild(darkBar);
                taskGroup.appendChild(darkOverlay);
            } else { // x_forecast_end > x_end
                // Caso 3: Previsión "en plazo" (termina más tarde de lo planificado)
                const normalBar = this.createSVGElement('path', {
                     d: `M ${x_start+3},${barY} L ${x_end},${barY} L ${x_end},${barY+this.barHeight} L ${x_start+3},${barY+this.barHeight} a 3 3 0 0 1 -3 -3 L ${x_start},${barY+3} a 3 3 0 0 1 3 -3 z`,
                    fill: taskColor,
                    class: 'task-bar'
                });
                taskGroup.appendChild(normalBar);

                const lightBar = this.createSVGElement('path', {
                    d: `M ${x_end},${barY} L ${x_forecast_end-3},${barY} a 3 3 0 0 1 3 3 L ${x_forecast_end},${barY+this.barHeight-3} a 3 3 0 0 1 -3 3 L ${x_end},${barY+this.barHeight} z`,
                    fill: taskColor,
                    'fill-opacity': '0.5',
                    'stroke': taskColor,
                    'stroke-width': '1px',
                    'stroke-dasharray': '4 2',
                    class: 'task-bar task-bar-forecast'
                });
                taskGroup.appendChild(lightBar);
            }
            tasksGroup.appendChild(taskGroup);
        });
        parent.appendChild(tasksGroup);
    }

    renderDependencies(parent) {
        const dependenciesGroup = this.createSVGElement('g');
        this.tasks.forEach((task, targetIndex) => {
            if (!task.dependencies) return;
            task.dependencies.forEach(depId => {
                const sourceTask = this.taskMap.get(depId);
                if (!sourceTask) return;
                const sourceIndex = this.tasks.findIndex(t => t.id === depId);

                const sourceBarX = this.diffDays(this.totalStartDate, this.parseDate(sourceTask.end)) * this.dayWidth;
                const targetBarX = this.diffDays(this.totalStartDate, this.parseDate(task.start)) * this.dayWidth;

                const startY = this.config.headerHeight + sourceIndex * this.rowHeight + this.rowHeight / 2;
                const endY = this.config.headerHeight + targetIndex * this.rowHeight + this.rowHeight / 2;

                const startX = sourceBarX + this.dayWidth;
                const endX = targetBarX;
                const hOffset = this.config.padding / 2;

                let path = `M ${startX} ${startY} L ${startX + hOffset} ${startY} `;
                if (endX < startX + hOffset) {
                   const verticalChannelY = endY > startY ? startY + this.rowHeight / 2 : startY - this.rowHeight / 2;
                   path += `L ${startX + hOffset} ${verticalChannelY} `;
                   const finalVerticalChannelX = endX - hOffset;
                   path += `L ${finalVerticalChannelX} ${verticalChannelY} `;
                   path += `L ${finalVerticalChannelX} ${endY} `;
                }
                path += `L ${endX} ${endY}`;

                const line = this.createSVGElement('path', { d: path, class: 'dependency-line' });
                dependenciesGroup.appendChild(line);
            });
        });
        parent.appendChild(dependenciesGroup);
    }

    renderTodayMarker(parent, chartHeight) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (today >= this.totalStartDate && today <= this.totalEndDate) {
            const x = this.diffDays(this.totalStartDate, today) * this.dayWidth;
            const line = this.createSVGElement('line', { x1: x, y1: this.config.headerHeight, x2: x, y2: chartHeight - this.config.padding * 2, class: 'today-marker' });
            parent.appendChild(line);
        }
    }

    renderEventMarkers(parent, chartHeight) {
        this.events.forEach(event => {
            const eventDate = this.parseDate(event.date);
            if (eventDate >= this.totalStartDate && eventDate <= this.totalEndDate) {
                const x = this.diffDays(this.totalStartDate, eventDate) * this.dayWidth;
                const line = this.createSVGElement('line', { x1: x, y1: this.config.headerHeight, x2: x, y2: chartHeight - this.config.padding * 2, class: 'event-marker-line' });
                parent.appendChild(line);
                const hitbox = this.createSVGElement('line', { x1: x, y1: this.config.headerHeight, x2: x, y2: chartHeight - this.config.padding * 2, class: 'event-hitbox' });
                hitbox.dataset.eventName = event.name;
                parent.appendChild(hitbox);
            }
        });
    }

    attachEventListeners() {
        this.scrollWrapper.addEventListener('wheel', this.handleZoom.bind(this), { passive: false });
        this.chartContainer.addEventListener('mousemove', this.handleTooltipMove.bind(this));
        this.chartContainer.addEventListener('mouseout', this.handleTooltipOut.bind(this));
        new ResizeObserver(() => this.handleResize()).observe(this.scrollWrapper.parentElement);
    }

    handleResize() {
        this.calculateFitZoom();
        this.render();
    }

    handleZoom(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.viewState.zoomX = Math.max(this.config.zoomMin, Math.min(this.config.zoomMax, this.viewState.zoomX + delta));
            this.viewState.zoomY = Math.max(this.config.zoomMin, Math.min(this.config.zoomMax, this.viewState.zoomY + delta));
            this.render();
        }
    }

    handleTooltipMove(e) {
        const target = e.target;
        let content = '';
        
        const taskGroup = target.closest('.task-group');

        if (taskGroup) {
            const taskId = taskGroup.getAttribute('data-task-id');
            const task = this.taskMap.get(taskId);

            if (!task) {
                this.tooltip.style.opacity = '0';
                return;
            }

            const format = (date) => date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
            
            const startDateObj = this.parseDate(task.start);
            const endDateObj = this.parseDate(task.end);

            content = `<strong>${task.name}</strong><br>Inicio: ${format(startDateObj)}<br>Fin Planificado: ${format(endDateObj)}`;

            if (task.forecast_end) {
                const forecastEndObj = this.parseDate(task.forecast_end);
                
                // --- LÒGICA DE TEXTOS INVERTIDA SEGONS SOL·LICITAT ---
                const status = forecastEndObj.getTime() < endDateObj.getTime() ? ' (Fuera de plazo)' : forecastEndObj.getTime() > endDateObj.getTime() ? ' (En plazo)' : ' (A tiempo)';
                
                content += `<hr style="margin: 4px 0;"><em>Previsión Fin: ${format(forecastEndObj)}${status}</em>`;
            }

        } else if (target.classList.contains('event-hitbox')) {
            content = `<strong>Evento:</strong> ${target.dataset.eventName}`;
        }

        if (content) {
            this.tooltip.innerHTML = content;
            this.tooltip.style.opacity = '1';
            this.tooltip.style.left = `${e.pageX + 15}px`;
            this.tooltip.style.top = `${e.pageY}px`;
        } else {
            this.tooltip.style.opacity = '0';
        }
    }

    handleTooltipOut(e) { this.tooltip.style.opacity = '0'; }
    getWeekNumber(d) { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return weekNo; }
    parseDate(dateString) { return new Date(dateString + 'T00:00:00Z'); }
    diffDays(d1, d2) { return (d2 - d1) / (1000 * 60 * 60 * 24); }
    createSVGElement(tag, attrs = {}) { const el = document.createElementNS(this.svgNS, tag); for (const attr in attrs) el.setAttribute(attr, attrs[attr]); return el; }
}
