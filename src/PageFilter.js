const utils = require('./utils');

module.exports = class PageFilter {
    constructor({
        filterListAttr = 'data-filter-list',
        filterItemAttr = 'data-filter-item',
        filterDataAttr = 'data-global-filter',
        filterInputAttr = 'data-filter-input',
        filterNameAttr = 'data-filter-name',
        filterValueAttr = 'data-filter-value',
        clearFilterSelector = '[data-clear-filters]',
    }) {
        this.filterListAttr = filterListAttr;
        this.filterItemAttr = filterItemAttr;
        this.filterDataAttr = filterDataAttr;
        this.filterInputAttr = filterInputAttr;
        this.filterNameAttr = filterNameAttr;
        this.filterValueAttr = filterValueAttr;
        this.clearFilterSelector = clearFilterSelector;
        this.localStorageKey = 'kidadl-filters';
    }

    init() {
        this.applyLocalStorage();
        utils.addEventListenerToSelector(`[${this.filterInputAttr}]`, 'change', this.filter.bind(this));
        utils.addEventListenerToSelector(`${this.clearFilterSelector}`, 'click', this.clearFilters.bind(this));
    }

    async filter() {
        const filterState = this.getState();
        this.setLocalStorage(filterState);
        const elementsWithData = this.getElementsWithData();
        elementsWithData.forEach(({ el, data }) => {
            const shouldBeVisible = this.filterItem(data, filterState);
            el.style.display = shouldBeVisible ? 'block' : 'none';
        });
    }

    getState() {
        const checkedFilterElements = utils.getAll(`[${this.filterInputAttr}]:checked`);
        const filterValuesFromElements = this.getFilterValuesFromInputs(checkedFilterElements);
        return filterValuesFromElements;
    }

    getFilterValuesFromInputs(elements) {
        const values = {};
        elements.forEach((el) => {
            const parentNode = el.parentNode;
            const filterNameEl = parentNode.querySelector(`[${this.filterNameAttr}]`)
            if (!filterNameEl) {
                console.log('Filter name value missing for element', el);
                return;
            }
            const filterName = filterNameEl.getAttribute(this.filterNameAttr);
            const filterValue = filterNameEl.getAttribute(this.filterValueAttr);
            if (!values[filterName]) {
                values[filterName] = [];
            }
            values[filterName].push(filterValue);
        });
        return values;
    }

    getElementsWithData() {
        return utils.getAll(`[${this.filterItemAttr}]`).map((el) => {
            const dataElement = el.querySelector(`[${this.filterDataAttr}]`);
            let data = {};
            if (dataElement) {
                const jsonString = dataElement.getAttribute(this.filterDataAttr);
                try {
                    data = JSON.parse(jsonString);
                } catch (e) {
                    console.log('Could not parse JSON', jsonString);
                }
            }
            return {
                el,
                data
            };
        });
    }

    filterItem(itemData, appliedFilters) {
        let includeItem = true;
        for (const [filterName, filterValues] of Object.entries(appliedFilters)) {
            if (!filterValues || !Array.isArray(filterValues)) {
                // No value applied for filter, skip
                continue;
            }
            const itemDataForFilterName = itemData[filterName]
            if (!itemDataForFilterName || !Array.isArray(itemDataForFilterName)) {
                return false;
            }
            const itemIncludesAtLeastOneValue = itemDataForFilterName.some((dataValue) => {
                return filterValues.includes(dataValue);
            });
            if (!itemIncludesAtLeastOneValue) {
                return false;
            }
        }
        return includeItem;
    }

    applyLocalStorage() {
        const storedFiltersString = window.localStorage.getItem(this.localStorageKey);

        if (!storedFiltersString) {
            return;
        }
        const storedFilters = JSON.parse(storedFiltersString);
        Object.entries(storedFilters).forEach(([filterName, filterValues]) => {
            filterValues.forEach((value) => {
                this.setInputWithFilterValues(filterName, value);
            });
        });
    }

    setInputWithFilterValues(filterName, filterValue) {
        const elements = utils.getAll(`[${this.filterNameAttr}="${filterName}"][${this.filterValueAttr}="${filterValue}"]`);
        elements.forEach((el) => {
            const parent = el.parentNode.parentNode;
            const inputs = [...parent.querySelectorAll(`[${this.filterInputAttr}]`)];
            inputs.forEach((input) => input.click());
        });
    }

    setLocalStorage(value) {
        if (!value) {
            window.localStorage.setItem(this.localStorageKey, null);
        }
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(value));
    }

    clearFilters() {
        const allInputs = utils.getAll(`[${this.filterInputAttr}]`).forEach((el) => {
            el.checked = false;
        });
        this.filter();
    }
}