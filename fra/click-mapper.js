(function (global) {
    'use strict';

    var MAP_FIELDS = ['step', 'desc', 'hSrc', 'hGrp', 'hList', 'risk', 'ctrl', 'freq', 'sev', 'like'];
    var MULTI_MAP_FIELDS = { ctrl: true };

    function normalizeColInput(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    }

    function unique(values) {
        var out = [];
        values.forEach(function (v) {
            if (out.indexOf(v) === -1) out.push(v);
        });
        return out;
    }

    function splitColumns(value) {
        var raw = [];
        if (Array.isArray(value)) {
            raw = value;
        } else {
            raw = String(value || '').split(/[|,;+/\n]+/g);
        }
        return unique(raw.map(normalizeColInput).filter(Boolean));
    }

    function normalizeMap(mapInput) {
        var out = {};
        MAP_FIELDS.forEach(function (fieldKey) {
            var cols = splitColumns(mapInput && mapInput[fieldKey]);
            if (MULTI_MAP_FIELDS[fieldKey]) {
                out[fieldKey] = cols.join('|');
            } else {
                out[fieldKey] = cols[0] || '';
            }
        });
        return out;
    }

    function getFieldColumns(mapInput, fieldKey) {
        var normalized = normalizeMap(mapInput || {});
        var cols = splitColumns(normalized[fieldKey]);
        if (MULTI_MAP_FIELDS[fieldKey]) return cols;
        return cols.length ? [cols[0]] : [];
    }

    function buildMapFromColumnSelections(assignments) {
        var out = {};
        var ctrlCols = [];

        MAP_FIELDS.forEach(function (fieldKey) {
            out[fieldKey] = '';
        });

        (assignments || []).forEach(function (item) {
            var col = normalizeColInput(item && item.col);
            var fieldKey = String(item && item.field || '');
            if (!col || MAP_FIELDS.indexOf(fieldKey) === -1) return;

            if (fieldKey === 'ctrl') {
                if (ctrlCols.indexOf(col) === -1) ctrlCols.push(col);
                return;
            }
            out[fieldKey] = col;
        });

        out.ctrl = ctrlCols.join('|');
        return normalizeMap(out);
    }

    function getMappedByCol(mapInput) {
        var normalized = normalizeMap(mapInput || {});
        var byCol = {};

        MAP_FIELDS.forEach(function (fieldKey) {
            var cols = getFieldColumns(normalized, fieldKey);
            cols.forEach(function (col, idx) {
                if (!byCol[col]) byCol[col] = [];
                byCol[col].push({ field: fieldKey, index: idx + 1 });
            });
        });

        return byCol;
    }

    function labelForMappingEntry(entry, fieldLabelByKey) {
        if (!entry) return '';
        if (entry.field === 'ctrl') {
            return 'Existing Controls ' + String(entry.index || 1);
        }
        return (fieldLabelByKey && fieldLabelByKey[entry.field]) || entry.field;
    }

    function combineControlValues(values) {
        var items = (values || []).map(function (v) {
            return String(v || '').trim();
        }).filter(Boolean);

        if (items.length === 0) return '';
        if (items.length === 1) return items[0];

        return items.map(function (v, idx) {
            return 'Existing Controls ' + (idx + 1) + ': ' + v;
        }).join('\n');
    }

    global.RABClickMapper = Object.freeze({
        MAP_FIELDS: MAP_FIELDS.slice(),
        normalizeColInput: normalizeColInput,
        normalizeMap: normalizeMap,
        getFieldColumns: getFieldColumns,
        buildMapFromColumnSelections: buildMapFromColumnSelections,
        getMappedByCol: getMappedByCol,
        labelForMappingEntry: labelForMappingEntry,
        combineControlValues: combineControlValues
    });
})(window);
