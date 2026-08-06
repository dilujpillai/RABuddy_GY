(function (global) {
    'use strict';

    function normalizeColLetter(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    }

    function colLetterToIndex(col) {
        var safeCol = normalizeColLetter(col);
        if (!safeCol) return -1;

        var index = 0;
        for (var i = 0; i < safeCol.length; i++) {
            index = index * 26 + (safeCol.charCodeAt(i) - 64);
        }
        return index - 1;
    }

    function indexToColLetter(idx) {
        var n = Number(idx);
        if (!Number.isFinite(n) || n < 0) return '';

        var letter = '';
        var value = Math.floor(n) + 1;
        while (value > 0) {
            var rem = (value - 1) % 26;
            letter = String.fromCharCode(65 + rem) + letter;
            value = Math.floor((value - 1) / 26);
        }
        return letter;
    }

    function initializeMapping(fieldDefs) {
        var mapping = {};
        (fieldDefs || []).forEach(function (field) {
            if (field && field.key) mapping[field.key] = '';
        });
        return mapping;
    }

    function hasField(fieldDefs, fieldKey) {
        return (fieldDefs || []).some(function (field) {
            return !!field && field.key === fieldKey;
        });
    }

    function clearColumn(mapping, col) {
        var normalizedCol = normalizeColLetter(col);
        if (!normalizedCol || !mapping) return;

        Object.keys(mapping).forEach(function (fieldKey) {
            if (normalizeColLetter(mapping[fieldKey]) === normalizedCol) {
                mapping[fieldKey] = '';
            }
        });
    }

    function setFieldMapping(mapping, fieldDefs, fieldKey, col) {
        if (!mapping || !hasField(fieldDefs, fieldKey)) return false;

        var normalizedCol = normalizeColLetter(col);
        if (!normalizedCol) {
            mapping[fieldKey] = '';
            return true;
        }

        clearColumn(mapping, normalizedCol);
        mapping[fieldKey] = normalizedCol;
        return true;
    }

    function getMappedFieldForColumn(mapping, col) {
        var normalizedCol = normalizeColLetter(col);
        if (!normalizedCol || !mapping) return '';

        var entry = Object.entries(mapping).find(function (pair) {
            return normalizeColLetter(pair[1]) === normalizedCol;
        });
        return entry ? entry[0] : '';
    }

    function isColumnMapped(mapping, col) {
        return !!getMappedFieldForColumn(mapping, col);
    }

    function getMappingSnapshot(mapping) {
        var out = {};
        Object.keys(mapping || {}).forEach(function (key) {
            out[key] = normalizeColLetter(mapping[key]);
        });
        return out;
    }

    function applyMappingDefaults(mapping, fieldDefs, defaults, overwriteExisting) {
        if (!mapping || !defaults || typeof defaults !== 'object') return 0;

        var applied = 0;
        (fieldDefs || []).forEach(function (field) {
            if (!field || !field.key) return;

            var col = normalizeColLetter(defaults[field.key]);
            if (!col) return;
            if (!overwriteExisting && normalizeColLetter(mapping[field.key])) return;

            setFieldMapping(mapping, fieldDefs, field.key, col);
            applied++;
        });

        return applied;
    }

    function getMappedCount(mapping) {
        return Object.values(mapping || {}).filter(function (val) {
            return !!normalizeColLetter(val);
        }).length;
    }

    function getRequiredTotal(fieldDefs) {
        return (fieldDefs || []).filter(function (field) {
            return !!(field && field.required);
        }).length;
    }

    function getRequiredMappedCount(mapping, fieldDefs) {
        return (fieldDefs || []).filter(function (field) {
            return !!(field && field.required && normalizeColLetter(mapping[field.key]));
        }).length;
    }

    global.RABExcelMapperCore = Object.freeze({
        normalizeColLetter: normalizeColLetter,
        colLetterToIndex: colLetterToIndex,
        indexToColLetter: indexToColLetter,
        initializeMapping: initializeMapping,
        clearColumn: clearColumn,
        setFieldMapping: setFieldMapping,
        getMappedFieldForColumn: getMappedFieldForColumn,
        isColumnMapped: isColumnMapped,
        getMappingSnapshot: getMappingSnapshot,
        applyMappingDefaults: applyMappingDefaults,
        getMappedCount: getMappedCount,
        getRequiredTotal: getRequiredTotal,
        getRequiredMappedCount: getRequiredMappedCount
    });
})(window);
