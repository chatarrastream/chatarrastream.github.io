import * as Sortable from 'sortable';

// Modelo de datos
class TunaDatabase {
    constructor() {
        this.records = JSON.parse(localStorage.getItem('tunaRecords')) || [];
        this.customFields = JSON.parse(localStorage.getItem('tunaCustomFields')) || [];
        this.defaultFields = ['nombre', 'mote', 'instrumento', 'anio'];
        this.sortField = 'nombre';
        this.sortDirection = 'asc';
    }

    addRecord(record) {
        this.records.push(record);
        this.saveToLocalStorage();
        return record;
    }

    updateRecord(id, updatedRecord) {
        const index = this.records.findIndex(record => record.id === id);
        if (index !== -1) {
            this.records[index] = { ...this.records[index], ...updatedRecord };
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    deleteRecord(id) {
        this.records = this.records.filter(record => record.id !== id);
        this.saveToLocalStorage();
    }

    addCustomField(fieldName) {
        if (!this.defaultFields.includes(fieldName) && !this.customFields.includes(fieldName)) {
            this.customFields.push(fieldName);
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    deleteCustomField(fieldName) {
        if (this.customFields.includes(fieldName)) {
            this.customFields = this.customFields.filter(field => field !== fieldName);
            
            // Eliminar el campo de todos los registros
            this.records.forEach(record => {
                delete record[fieldName];
            });
            
            this.saveToLocalStorage();
            return true;
        }
        return false;
    }

    getAllFields() {
        return [...this.defaultFields, ...this.customFields];
    }

    sortRecords(field, direction) {
        this.sortField = field;
        this.sortDirection = direction;
        
        return [...this.records].sort((a, b) => {
            let valueA = a[field] !== undefined ? a[field] : '';
            let valueB = b[field] !== undefined ? b[field] : '';
            
            // Convertir a número si es el año
            if (field === 'anio') {
                valueA = Number(valueA);
                valueB = Number(valueB);
            } else {
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }
            
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    searchRecords(query) {
        if (!query) return this.sortRecords(this.sortField, this.sortDirection);
        
        const fields = this.getAllFields();
        const lowerQuery = query.toLowerCase();
        
        return this.records.filter(record => {
            return fields.some(field => {
                const value = record[field];
                return value && String(value).toLowerCase().includes(lowerQuery);
            });
        });
    }

    exportToCSV() {
        const fields = this.getAllFields();
        const header = fields.join(',');
        
        const rows = this.records.map(record => {
            return fields.map(field => {
                const value = record[field] !== undefined ? record[field] : '';
                // Escapar las comas y comillas
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });
        
        return [header, ...rows].join('\n');
    }

    saveToLocalStorage() {
        localStorage.setItem('tunaRecords', JSON.stringify(this.records));
        localStorage.setItem('tunaCustomFields', JSON.stringify(this.customFields));
    }
}

// Controlador
class TunaController {
    constructor() {
        this.db = new TunaDatabase();
        this.view = new TunaView(this);
        this.init();
    }
    
    init() {
        this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
        this.view.renderCustomFields(this.db.customFields);
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Formulario para añadir registros
        document.getElementById('record-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddRecord();
        });
        
        // Botón para limpiar el formulario
        document.getElementById('clear-btn').addEventListener('click', () => {
            document.getElementById('record-form').reset();
        });
        
        // Añadir campo personalizado
        document.getElementById('add-field-btn').addEventListener('click', () => {
            this.handleAddField();
        });
        
        // Ordenar tabla
        document.getElementById('table-header').addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (th && th.dataset.field) {
                this.handleSort(th.dataset.field);
            }
        });
        
        // Buscar
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        // Exportar a CSV
        document.getElementById('export-btn').addEventListener('click', () => {
            this.handleExport();
        });
        
        // Delegación de eventos para acciones en la tabla (editar/eliminar)
        document.getElementById('table-body').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const id = e.target.closest('tr').dataset.id;
                this.handleDeleteRecord(id);
            } else if (e.target.classList.contains('edit-btn')) {
                const id = e.target.closest('tr').dataset.id;
                this.handleEditRecord(id);
            }
        });
        
        // Delegación de eventos para eliminar campos personalizados
        document.getElementById('fields-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-field-btn') && !e.target.disabled) {
                const fieldName = e.target.dataset.field;
                this.handleDeleteField(fieldName);
            }
        });
    }
    
    handleAddRecord() {
        const form = document.getElementById('record-form');
        const fields = this.db.getAllFields();
        
        const record = {
            id: Date.now().toString()
        };
        
        fields.forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                record[field] = input.value;
            }
        });
        
        this.db.addRecord(record);
        this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
        form.reset();
    }
    
    handleEditRecord(id) {
        const record = this.db.records.find(r => r.id === id);
        if (!record) return;
        
        const fields = this.db.getAllFields();
        const updatedRecord = {};
        
        fields.forEach(field => {
            const newValue = prompt(`Nuevo valor para ${field}:`, record[field] || '');
            if (newValue !== null) {
                updatedRecord[field] = newValue;
            }
        });
        
        if (Object.keys(updatedRecord).length > 0) {
            this.db.updateRecord(id, updatedRecord);
            this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
        }
    }
    
    handleDeleteRecord(id) {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            this.db.deleteRecord(id);
            this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
        }
    }
    
    handleAddField() {
        const fieldInput = document.getElementById('new-field-name');
        const fieldName = fieldInput.value.trim().replace(/\s+/g, '_').toLowerCase();
        
        if (!fieldName) {
            alert('Por favor ingresa un nombre para el campo');
            return;
        }
        
        if (this.db.getAllFields().includes(fieldName)) {
            alert('Este campo ya existe');
            return;
        }
        
        if (this.db.addCustomField(fieldName)) {
            this.view.renderCustomFields(this.db.customFields);
            this.view.updateTableHeader(this.db.getAllFields());
            this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
            fieldInput.value = '';
        }
    }
    
    handleDeleteField(fieldName) {
        if (confirm(`¿Estás seguro de eliminar el campo "${fieldName}"?`)) {
            if (this.db.deleteCustomField(fieldName)) {
                this.view.renderCustomFields(this.db.customFields);
                this.view.updateTableHeader(this.db.getAllFields());
                this.view.renderTable(this.db.sortRecords(this.db.sortField, this.db.sortDirection));
            }
        }
    }
    
    handleSort(field) {
        const direction = this.db.sortField === field && this.db.sortDirection === 'asc' ? 'desc' : 'asc';
        const sortedRecords = this.db.sortRecords(field, direction);
        this.view.renderTable(sortedRecords, field, direction);
    }
    
    handleSearch(query) {
        const filteredRecords = this.db.searchRecords(query);
        this.view.renderTable(filteredRecords, this.db.sortField, this.db.sortDirection);
    }
    
    handleExport() {
        const csv = this.db.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'tuna_database.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Vista
class TunaView {
    constructor(controller) {
        this.controller = controller;
    }
    
    renderTable(records, sortField, sortDirection) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';
        
        if (records.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.textContent = 'No hay registros disponibles';
            emptyCell.colSpan = this.controller.db.getAllFields().length + 1;
            emptyCell.style.textAlign = 'center';
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);
            return;
        }
        
        records.forEach(record => {
            const row = document.createElement('tr');
            row.dataset.id = record.id;
            
            this.controller.db.getAllFields().forEach(field => {
                const cell = document.createElement('td');
                cell.textContent = record[field] !== undefined ? record[field] : '';
                row.appendChild(cell);
            });
            
            const actionsCell = document.createElement('td');
            
            const editBtn = document.createElement('button');
            editBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editBtn.classList.add('edit-btn');
            editBtn.title = 'Editar';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.title = 'Eliminar';
            
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);
            
            tableBody.appendChild(row);
        });
        
        // Actualizar indicadores de ordenación
        if (sortField) {
            const headers = document.querySelectorAll('#table-header th');
            headers.forEach(th => {
                th.classList.remove('sorted');
                const icon = th.querySelector('.sort-icon');
                if (icon) icon.textContent = '▼';
                
                if (th.dataset.field === sortField) {
                    th.classList.add('sorted');
                    if (icon) icon.textContent = sortDirection === 'asc' ? '▲' : '▼';
                }
            });
        }
    }
    
    renderCustomFields(customFields) {
        // Actualizar lista de campos
        const fieldsList = document.getElementById('fields-list');
        
        // Mantener los campos por defecto
        const defaultFields = this.controller.db.defaultFields;
        let fieldsHTML = defaultFields.map(field => {
            return `<li>${this.formatFieldName(field)} <button class="delete-field-btn" data-field="${field}" disabled>Eliminar</button></li>`;
        }).join('');
        
        // Añadir campos personalizados
        fieldsHTML += customFields.map(field => {
            return `<li>${this.formatFieldName(field)} <button class="delete-field-btn" data-field="${field}">Eliminar</button></li>`;
        }).join('');
        
        fieldsList.innerHTML = fieldsHTML;
        
        // Actualizar campos en el formulario
        this.updateCustomFormFields(customFields);
    }
    
    updateCustomFormFields(customFields) {
        const customFieldsContainer = document.getElementById('custom-fields');
        customFieldsContainer.innerHTML = '';
        
        customFields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.classList.add('form-group');
            
            const label = document.createElement('label');
            label.setAttribute('for', field);
            label.textContent = this.formatFieldName(field) + ':';
            
            const input = document.createElement('input');
            input.setAttribute('type', 'text');
            input.setAttribute('id', field);
            
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(input);
            customFieldsContainer.appendChild(fieldDiv);
        });
    }
    
    updateTableHeader(fields) {
        const headerRow = document.querySelector('#table-header tr');
        
        // Limpiar encabezados actuales
        headerRow.innerHTML = '';
        
        // Añadir columnas para cada campo
        fields.forEach(field => {
            const th = document.createElement('th');
            th.dataset.field = field;
            th.innerHTML = `${this.formatFieldName(field)} <span class="sort-icon">▼</span>`;
            headerRow.appendChild(th);
        });
        
        // Columna de acciones
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Acciones';
        headerRow.appendChild(actionsHeader);
    }
    
    formatFieldName(field) {
        return field
            .replace(/^./, match => match.toUpperCase())
            .replace(/_/g, ' ');
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    const app = new TunaController();
});