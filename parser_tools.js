// var fs = require('fs');

async function getText(element, selector) {
    var value;
    try {
        value = await element.$eval(selector, node => node.textContent);
    } catch (e) {
        console.log('missing text for selector', selector);
    }
    return value;
}

async function getHref(element, selector) {
    var value;
    try {
        value = await element.$eval(selector, el => el.href);
    } catch (e) {
        console.log('missing href for selector', selector);
    }
    return value;
}

async function getHTML(element, selector) {
    var value;
    try {
        value = await element.$eval(selector, node => node.innerHTML);
    } catch (e) {
        console.log('missing html for selector', selector);
    }
    return value;
}

const isElementVisible = async (page, cssSelector) => {
  let visible = true;
  await page
    .waitForSelector(cssSelector, { visible: true, timeout: 2000 })
    .catch(() => {
      visible = false;
    });
  return visible;
};

async function loadProductsClick(page, selector, clickLimit = Infinity) {
    let clicks = 0;
    let loadMoreVisible = await isElementVisible(page, selector);
    while (loadMoreVisible && (clicks < clickLimit)) {
      await page
        .click(selector)
        .catch(() => {});
      loadMoreVisible = await isElementVisible(page, selector);
    }
}

async function loadProductsScroll(page, scrollLimit = Infinity) {
    let scrolls = 0;
    try {
        while (true && (scrolls < scrollLimit)) {
            scrolls += 1;
            let previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            await page.waitForTimeout(2000);
        }
    } catch (e) {
        console.log("page reached bottom");
    }
}

async function dumpXML(page, file) {
    const renderedContent = await page.evaluate(() => new XMLSerializer().serializeToString(document));
        
    const stream = fs.createWriteStream(file);
    stream.write(renderedContent);
    stream.end();
    console.log(`>> Write DOM model in ${file}`);
}


exports.getText = getText;
exports.getHref = getHref;
exports.getHTML = getHTML;
exports.isElementVisible = isElementVisible;
exports.loadProductsClick = loadProductsClick;
exports.loadProductsScroll = loadProductsScroll;
exports.dumpXML = dumpXML;