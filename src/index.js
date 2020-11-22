import 'regenerator-runtime/runtime.js'

const PageFilter = require('./PageFilter');
const PageBuster = require('./PageBuster');

const filter = new PageFilter({});
const pageBuster = new PageBuster();

async function init() {
    pageBuster.init({});

    await pageBuster.run();
    filter.init();
    filter.filter();
}

window.addEventListener('load', init);