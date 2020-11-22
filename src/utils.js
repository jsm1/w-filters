exports.addEventListenerToSelector = (selector, event, listener) => {
    return [...document.querySelectorAll(selector)].map((el) => {
        return el.addEventListener(event, listener);
    });
}

exports.getAll = (selector) => {
    return [...document.querySelectorAll(selector)];
}