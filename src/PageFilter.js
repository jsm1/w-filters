const utils = require('./utils');
const { get: lodashGet } = require('lodash');
const _ = {
    'get': lodashGet,
};

module.exports = class PageFilter {
    constructor({
        filterListAttr = 'data-filter-list',
        filterListCollectionAttr = 'data-filter-list-collection',
        listCountAttr = 'data-filter-list-count',
        filterItemAttr = 'data-filter-item',
        filterDataAttr = 'data-global-filter',
        filterInputAttr = 'data-filter-input',
        filterNameAttr = 'data-filter-name',
        filterValueAttr = 'data-filter-value',
        clearFilterSelector = '[data-clear-filters]',
        nextPageSelector = '.w-pagination-next',
        previousPageSelector = '.w-pagination-previous',
        filterActiveTrackerSelector = '[data-filter-state]',
        andFilterAttribute = 'data-and-filter',
        filterAlwaysActiveAttr = 'data-filter-always',
    }) {
        this.filterListAttr = filterListAttr;
        this.filterListCollectionAttr = filterListCollectionAttr;
        this.listCountAttr = listCountAttr;
        this.filterItemAttr = filterItemAttr;
        this.filterDataAttr = filterDataAttr;
        this.filterInputAttr = filterInputAttr;
        this.filterNameAttr = filterNameAttr;
        this.filterValueAttr = filterValueAttr;
        this.clearFilterSelector = clearFilterSelector;
        this.localStorageKey = 'kidadl-filters';
        this.nextPageSelector = nextPageSelector;
        this.previousPageSelector = previousPageSelector;
        this.filterActiveTrackerSelector = filterActiveTrackerSelector;
        this.andFilterAttribute = andFilterAttribute;
        this.filterAlwaysActiveAttr = filterAlwaysActiveAttr;
        this.clearing = false;
    }

    init() {
        this.initialStates = [];
        this.getInitialStates();
        this.initPagination();
        this.getTemplate();
        this.applyLocalStorage();
        utils.addEventListenerToSelector(`[${this.filterInputAttr}]`, 'change', this.filter.bind(this));
        utils.addEventListenerToSelector(`${this.clearFilterSelector}`, 'click', this.clearFilters.bind(this));
    }

    async filter() {
        if (this.clearing) {
            return;
        }
        const filterState = this.getState();
        console.log(filterState);
        this.setFilterTrackerClasses(filterState);
        const isNoFilterApplied = !Object.keys(filterState).length;
        if (isNoFilterApplied) {
            this.applyInitialState();
        } else {
            this.queryFilterState(filterState);
        }
        this.setLocalStorage(filterState);
        const elementsWithData = this.getElementsWithData();
        elementsWithData.forEach(({ el, data }) => {
            const shouldBeVisible = this.filterItem(data, filterState);
            el.style.display = shouldBeVisible ? 'block' : 'none';
        });
    }

    getState() {
        const checkedFilterElements = utils.getAll(`[${this.filterInputAttr}]:checked, [${this.filterAlwaysActiveAttr}]`);
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
            const attributeFilterName = filterNameEl.getAttribute(this.filterNameAttr);
            const filterValue = filterNameEl.getAttribute(this.filterValueAttr);
            const isAndFilter = !!el.getAttribute(this.andFilterAttribute);
            const filterName = isAndFilter ? (attributeFilterName + '*AND') : attributeFilterName;
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
        this.clearing = true;
        utils.getAll(`[${this.filterInputAttr}]:checked:not(${this.filterAlwaysActiveAttr})`).forEach((el) => {
            el.click();
        });
        this.clearing = false;
        this.filter();
    }

    queryFilterState(filter) {
        
        [...document.querySelectorAll(`[${this.filterListAttr}]`)].forEach((listEl) => {
            const collectionSlug = listEl.getAttribute(this.filterListCollectionAttr) || 'articles';
            const params = {
                collections: collectionSlug,
                query: filter,
                count: listEl.getAttribute(this.listCountAttr) || 25,
                offset: this.getPageOffset() || 0,
            };
            listEl.classList.add('is-loading');
            $.post('https://vnxocvrzmc.execute-api.eu-west-1.amazonaws.com/getItemsDB', JSON.stringify(params))
                .done((resp) => {
                    const items = JSON.parse(resp);
                    if (!items.length) {
                        console.log('No results, leaving page as is');
                        return;
                    }
                    const itemNodes = items.map((item) => {
                        const el = this.buildNodeFromItem(this.template, item, collectionSlug);
                        el.style.display = null;
                        return el;
                    });
                    listEl.innerHTML = '';
                    itemNodes.forEach((n) => listEl.appendChild(n));   
                })
                .fail((err) => {
                    console.error('An error occurred loading items', err);
                })
                .always(() => {
                    listEl.classList.remove('is-loading');
                });
        });
    }

    getTemplate() {
        this.template = document.querySelector(`[${this.filterItemAttr}]`).outerHTML;
    }

    buildNodeFromItem(template, item, collectionSlug) {
        const parentNode = document.createElement('div');
        parentNode.innerHTML = template;
        let templateFields = parentNode.querySelectorAll(`[data-tp-text]`);
        [...templateFields].forEach((el) => {
            const field = el.getAttribute('data-tp-text');
            if (field) {
               const value =  _.get(item, field);
               el.innerText = value;
            }
        });

        templateFields = parentNode.querySelectorAll(`[data-tp-src]`);
        [...templateFields].forEach((el) => {
            const field = el.getAttribute('data-tp-src');
            if (field) {
               const value =  _.get(item, field);
               el.src = value;
               el.removeAttribute('srcset');
            }
        });

        templateFields = parentNode.querySelectorAll(`[data-tp-html]`);
        [...templateFields].forEach((el) => {
            const field = el.getAttribute('data-tp-html');
            if (field) {
               const value =  _.get(item, field);
               el.innerHTML = value;
            }
        });

        templateFields = parentNode.querySelectorAll(`[data-tp-href]`);
        [...templateFields].forEach((el) => {
            const field = el.getAttribute('data-tp-href');
            if (/^slug$/i.test(field)) {
                el.href = `/${collectionSlug}/${item.Slug}`
                return;
            }
            if (field) {
               const value =  _.get(item, field);
               el.href = value;
            }
        });

        templateFields = parentNode.querySelectorAll(`[data-tp-att]`);
        [...templateFields].forEach((el) => {
            const field = el.getAttribute('data-tp-att');
            const attributes = field.split(',')
            attributes.forEach((attr) => {
                const [key, value] = attr.trim().split('=');
                if (key && value) {
                   const attValue =  _.get(item, value);
                   el.setAttribute(key, attValue);
                }
            })
        });
        return parentNode.children[0];
    }

    getPageOffset() {
        const searchString = window.location.search;
        const pageSplit = searchString.split(/page=/);
        const containsPageNumber = pageSplit[1];
        if (!containsPageNumber) {
            return 0;
        }
        return parseInt(pageSplit[1]);
    }

    initPagination() {
        // utils.addEventListenerToSelector(this.nextPageSelector, 'click', this.onPageClick.bind(this));
        // utils.addEventListenerToSelector(this.previousPageSelector, 'click', this.onPageClick.bind(this));
    }

    onPageClick(event) {
        event.preventDefault();
        const href = event.target.href;
        console.log(event.target);
        const pageOffset = this.getPageOffset() || 1;

        window.history.pushState(`${pageOffset}`, document.title, href);
        return false;
    }

    applyInitialState() {
        [...document.querySelectorAll(`[${this.filterListAttr}]`)].forEach((listEl, index) => {
            const initialStateItems = this.initialStates[index];
            listEl.innerHTML = '';
            initialStateItems.forEach((item) => listEl.appendChild(item));
        });
    }

    getInitialStates() {
        [...document.querySelectorAll(`[${this.filterListAttr}]`)].forEach((listEl) => {
            this.initialStates.push([...listEl.children]);
        });
    }

    setFilterTrackerClasses(state) {
        const isFilterSet = Object.entries(state).length;
        [...document.querySelectorAll(this.filterActiveTrackerSelector)].forEach((el) => {
            if (isFilterSet) {
                el.classList.add('is-filter-active');
            } else {
                el.classList.remove('is-filter-active');
            }
        });
    }

}