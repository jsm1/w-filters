module.exports = class PageBuster {
    constructor() {

    }

    init({
        nextPageSelector = '.w-pagination-next',
        itemSelector = '[data-filter-list] [data-filter-item]',
        chunkSize = 10,
    }) {
        this.nextPageSelector = nextPageSelector;
        this.itemSelector = itemSelector;
        this.chunkSize = chunkSize;
        this.parser = new DOMParser();
        this.items = [];
    }

    async run() {
        // Parse first page
        this.parsePage(document)

        const nextPagePrefix = this.getNextPagePrefix(document)
        let pageNumber = 2
        let lastPageReached = false
        while (!lastPageReached) {
            let count = 0
            const promises = []
            while (count < this.chunkSize) {
                promises.push(
                    this.getPage(nextPagePrefix, pageNumber)
                        .then((pageData) => {
                            const doc = this.parser.parseFromString(pageData, 'text/html')
                            this.parsePage(doc)
                            if (!this.getNextPageQueryString(doc)) {
                                lastPageReached = true
                            }
                        })
                )
                pageNumber++
                count++
            }
            await Promise.all(promises)
        }
        this.addItemsToPage()
    }

    async getPage(prefix, number) {
        const response = await fetch(`${prefix}${number}`);
        return response.text();
    }

    parsePage(doc) {
        this.items.push(...doc.querySelectorAll(this.itemSelector));
    }

    getNextPagePrefix(doc) {
        const queryString = this.getNextPageQueryString(doc)
        return queryString.replace(/=\d+$/, '=')
    }

    getNextPageQueryString(doc) {
        const nextPageNode = doc.querySelector(this.nextPageSelector)
        return nextPageNode ? nextPageNode.search : null
    }

    addItemsToPage() {
        const listItemParent = document.querySelector(this.itemSelector).parentNode
        this.items.forEach(node => {
            node.style.display = 'none'
            listItemParent.appendChild(node)
        })
    }
}

