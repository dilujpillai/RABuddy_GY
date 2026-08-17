(function (global) {
    'use strict';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function truncateText(value, maxLen) {
        var text = String(value || '');
        if (!Number.isFinite(maxLen) || maxLen <= 0) return text;
        return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    }

    function renderStandardPreview(options) {
        var columns = options && Array.isArray(options.columns) ? options.columns : [];
        var headerData = options && options.headerData ? options.headerData : null;
        var dataRows = options && Array.isArray(options.dataRows) ? options.dataRows : [];
        var isColumnMapped = options && typeof options.isColumnMapped === 'function'
            ? options.isColumnMapped
            : function () { return false; };

        var headerMappedClass = (options && options.headerMappedClass) || '';
        var cellMappedClass = (options && options.cellMappedClass) || '';
        var headerMaxLen = Number(options && options.headerMaxLen) || 12;
        var cellMaxLen = Number(options && options.cellMaxLen) || 20;
        var headerPrefix = (options && options.headerPrefix) || '';
        var mapping = options && options.mapping ? options.mapping : null;
        var rowActions = options && options.rowActions ? options.rowActions : null;
        var actionsHeaderCell = rowActions ? '<th class="gy-row-action-cell"></th>' : '';
        // The "Map to" row has one extra leading cell (its label) that the header-text row and
        // data rows don't have on their own - without a matching spacer cell here, every column
        // after it renders shifted by one, so column A's dropdown visually sits over column B's
        // header/data, column B's over column C's, etc.
        var mapLabelSpacerHeaderCell = '';
        var mapLabelSpacerBodyCell = '';

        var headerHtml = '';

        if (mapping && typeof mapping.buildMapOptions === 'function' && typeof mapping.getMappedFieldForColumn === 'function') {
            var mapRowClass = mapping.rowClass || '';
            var mapSelectClass = mapping.selectClass || '';
            var mapHeaderClass = mapping.mappedHeaderClass || headerMappedClass;
            var mapOnChangeHandler = mapping.onChangeHandlerName || '';
            var mapFirstCellLabel = mapping.firstCellLabel || 'Map to';
            mapLabelSpacerHeaderCell = '<th></th>';
            mapLabelSpacerBodyCell = '<td></td>';

            headerHtml += '<tr class="' + mapRowClass + '">' + actionsHeaderCell + '<th>' + escapeHtml(mapFirstCellLabel) + '</th>';
            columns.forEach(function (col) {
                var selectedField = mapping.getMappedFieldForColumn(col);
                var mappedClass = selectedField && mapHeaderClass ? mapHeaderClass : '';
                var selectHtml = mapOnChangeHandler
                    ? '<select class="' + mapSelectClass + '" data-col="' + escapeHtml(col) + '" onchange="' + mapOnChangeHandler + '(this)">' +
                        mapping.buildMapOptions(selectedField) +
                      '</select>'
                    : '';

                headerHtml += '<th class="' + mappedClass + '">' + selectHtml + '</th>';
            });
            headerHtml += '</tr>';
        }

        headerHtml += '<tr>' + actionsHeaderCell + mapLabelSpacerHeaderCell;
        columns.forEach(function (col) {
            var rawHeaderText = headerData ? (headerData[col] || col) : col;
            var headerText = String(rawHeaderText || '');
            var mappedClass = isColumnMapped(col) && headerMappedClass ? headerMappedClass : '';
            var headerDisplay = headerPrefix
                ? (headerPrefix + ' ' + col + ': ' + truncateText(headerText, headerMaxLen))
                : (col + ': ' + truncateText(headerText, headerMaxLen));
            headerHtml += '<th class="' + mappedClass + '" title="' + escapeHtml(headerText) + '">' +
                escapeHtml(headerDisplay) +
                '</th>';
        });
        headerHtml += '</tr>';

        var bodyHtml = '';
        dataRows.forEach(function (row) {
            var rowNum = rowActions && typeof rowActions.getRowNum === 'function' ? rowActions.getRowNum(row) : null;
            var isDeleted = rowActions && rowNum != null && typeof rowActions.isDeleted === 'function' && rowActions.isDeleted(rowNum);
            bodyHtml += '<tr class="' + (isDeleted ? 'gy-row-deleted' : '') + '">';
            if (rowActions) {
                if (rowNum == null) {
                    bodyHtml += '<td class="gy-row-action-cell"></td>';
                } else if (isDeleted) {
                    bodyHtml += '<td class="gy-row-action-cell"><button type="button" class="gy-row-restore-btn" title="Restore this row" onclick="' +
                        escapeHtml(rowActions.restoreHandlerName) + '(' + Number(rowNum) + ')">↩️</button></td>';
                } else {
                    bodyHtml += '<td class="gy-row-action-cell"><button type="button" class="gy-row-del-btn" title="Delete this row" onclick="' +
                        escapeHtml(rowActions.deleteHandlerName) + '(' + Number(rowNum) + ')">🗑️</button></td>';
                }
            }
            bodyHtml += mapLabelSpacerBodyCell;
            columns.forEach(function (col) {
                var rawValue = row && row[col] ? row[col] : '';
                var value = String(rawValue || '');
                var mappedClass = isColumnMapped(col) && cellMappedClass ? cellMappedClass : '';
                bodyHtml += '<td class="' + mappedClass + '" title="' + escapeHtml(value) + '">' +
                    escapeHtml(truncateText(value, cellMaxLen)) +
                    '</td>';
            });
            bodyHtml += '</tr>';
        });

        var noDataColspan = Number(options && options.noDataColspan) || columns.length || 1;
        var noDataMessage = (options && options.noDataMessage) || 'No data found';
        if (!bodyHtml) {
            bodyHtml = '<tr><td colspan="' + noDataColspan + '" style="text-align:center; padding:16px; color:#94a3b8;">' +
                escapeHtml(noDataMessage) +
                '</td></tr>';
        }

        return {
            theadHtml: headerHtml,
            tbodyHtml: bodyHtml
        };
    }

    function renderColumnMappingPreview(options) {
        var columns = options && Array.isArray(options.columns) ? options.columns : [];
        var headerData = options && options.headerData ? options.headerData : null;
        var dataRows = options && Array.isArray(options.dataRows) ? options.dataRows : [];
        var headerRowNumber = Number(options && options.headerRowNumber) || 1;
        var getMappedFieldForColumn = options && typeof options.getMappedFieldForColumn === 'function'
            ? options.getMappedFieldForColumn
            : function () { return ''; };
        var getFieldLabel = options && typeof options.getFieldLabel === 'function'
            ? options.getFieldLabel
            : function (field) { return field || ''; };
        var buildMapOptions = options && typeof options.buildMapOptions === 'function'
            ? options.buildMapOptions
            : function () { return '<option value="">Unmapped</option>'; };
        var mapOnChangeHandlerName = (options && options.mapOnChangeHandlerName) || 'handleRA2025HeaderMapping';
        var isColumnMapped = options && typeof options.isColumnMapped === 'function'
            ? options.isColumnMapped
            : function () { return false; };

        var headerHtml = '<tr class="ra2025-map-row"><th>Map to</th>';
        columns.forEach(function (col) {
            var selectedField = getMappedFieldForColumn(col);
            var mappedClass = selectedField ? 'selected-col' : '';
            headerHtml += '<th class="' + mappedClass + '"><select class="ra2025-header-map-select" data-col="' +
                escapeHtml(col) + '" onchange="' + mapOnChangeHandlerName + '(this)">' +
                buildMapOptions(selectedField) + '</select></th>';
        });
        headerHtml += '</tr>';

        headerHtml += '<tr><th>Header (row ' + headerRowNumber + ')</th>';
        columns.forEach(function (col) {
            var rawHeaderText = headerData && headerData[col] ? headerData[col] : col;
            var headerText = String(rawHeaderText || '');
            var mappedField = getMappedFieldForColumn(col);
            var mappedLabel = mappedField ? getFieldLabel(mappedField) : '';
            var mappedClass = mappedField ? 'selected-col' : '';
            var badge = mappedLabel
                ? '<span class="ra2025-map-badge">' + escapeHtml(mappedLabel) + '</span>'
                : '';

            headerHtml += '<th class="' + mappedClass + '" title="' + escapeHtml(headerText) + '">' +
                '<span class="ra2025-header-col">' + escapeHtml(col) + '</span>' +
                '<span class="ra2025-header-title">' + escapeHtml(truncateText(headerText, 42)) + '</span>' +
                badge +
                '</th>';
        });
        headerHtml += '</tr>';

        var bodyHtml = '';
        dataRows.forEach(function (row) {
            var rowNum = row && row._rowNum ? row._rowNum : '';
            bodyHtml += '<tr><td class="ra2025-row-label">Row ' + escapeHtml(String(rowNum)) + '</td>';
            columns.forEach(function (col) {
                var value = String((row && row[col]) || '');
                var mappedClass = isColumnMapped(col) ? 'ra2025-col-mapped' : '';
                bodyHtml += '<td class="' + mappedClass + '" title="' + escapeHtml(value) + '">' +
                    escapeHtml(truncateText(value, 48)) +
                    '</td>';
            });
            bodyHtml += '</tr>';
        });

        if (!bodyHtml) {
            bodyHtml = '<tr><td colspan="' + (columns.length + 1) + '" style="text-align:center; padding:20px; color:#94a3b8;">No data found in selected rows</td></tr>';
        }

        return {
            theadHtml: headerHtml,
            tbodyHtml: bodyHtml
        };
    }

    global.RABExcelMapperUI = Object.freeze({
        escapeHtml: escapeHtml,
        truncateText: truncateText,
        renderStandardPreview: renderStandardPreview,
        renderColumnMappingPreview: renderColumnMappingPreview
    });
})(window);
