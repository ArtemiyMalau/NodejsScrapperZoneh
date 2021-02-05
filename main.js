const config = require("./config");
const tools = require("./parser_tools.js");
// const connection = require("./database.js");

const Recognize = require('recognize');
const puppeteer = require('puppeteer');
const fs = require('fs');
const url = require('url');
// const crypto = require('crypto');

const URL = new url.URL("https://zone-h.org/archive?");
const AVAILABLE_ARGS = ["domain"];
let URL_PARTS = {
	"filter": 1,
	"domain": "",
	"fulltext": 1,
	"page": 1
}

const CAPTCHA_PATH = "captcha.jpeg";
const SOLVE_CAPTCHA_ATTEMPTS = 5;


function construct_url(url, url_parts) {
	for(let arg in url_parts) {
		if (URL_PARTS[arg]) {
			url.searchParams.set(arg, URL_PARTS[arg]);
		}
	}

	return url;
}

class ParseBrowser {
    constructor() {
        this.browserOptions = {
        	headless: false
        };
        this.userAgent = "Mozilla/6.0 (Windows NT 6.1; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0";
    }

    async run() {
        console.log(">> Start browser");
        this.browser = await puppeteer.launch(this.browserOptions);

        this.page = await this.browser.newPage();
        await this.page.setDefaultNavigationTimeout(5000);
        this.page.setUserAgent(this.userAgent);

        let previous_page = URL_PARTS["page"] - 1;
       	while (true) {
        	let parseData = await this.parse(construct_url(URL, URL_PARTS));
        	console.log(parseData["page"]);

       		if (previous_page == parseData["page"]) {
       			break;
       		}
       		URL_PARTS["page"] += 1;
       		previous_page = parseData["page"];
       	}

     	this.browser.close();
    }

    async close() {
        this.browser.close();
    }

    async parse(URL) {
    	console.log(URL.href);
    	await this.page.goto(URL.href);

    	let attempts = 0;
    	while (! await this.trySolveImageCaptcha("#cryptogram", "input[type=text][name*=captcha]", "input[type=submit]")) {
    		attempts += 1;
	    	if (attempts == SOLVE_CAPTCHA_ATTEMPTS) {
	    		return;
	    	}
    	}

    	let page = await this.page.$eval("td.defacepages > strong", item => item.textContent);
    	let tableData = await this.parseTable();

    	return {page: page, table: tableData};
    }

    async parseTable() {
    	let trArr = [];
    	let trEls = await this.page.$$eval("#ldeface > tbody > tr", list => list.map(item => {
    		let tr = [];

    		let tds = item.querySelectorAll("td");
			tds.forEach(function(td) {
				tr.push(td.textContent);
			});

    		return tr;
    	}));
    	trEls = trEls.slice(1, -2);

    	return trEls;
    }

    async checkCaptchaExist(captchaEl) {
    	try {
	 		await this.page.waitForSelector(captchaEl);
	 		return true;  // page have captcha element
		} catch (e) {
			return false; // page doesn't have captcha element
		}
    }

    async trySolveImageCaptcha(captchaEl, inputEl, submitEl) {
    	if (! await this.checkCaptchaExist(captchaEl)) {
			return true; // page doesn't have captcha element
    	}

		// make captcha screenshot and safe on local machine
	  	const captcha = await this.page.$(captchaEl);
	  	await captcha.screenshot({path: CAPTCHA_PATH});

	  	// create recognize instance
	  	var recognize = new Recognize('rucaptcha', {
		    key: config["rucaptcha"]["api_key"]
		});

	  	// get captcha solve code
	  	let captchaCode = await new Promise((resolve, reject) => {
	  		fs.readFile(CAPTCHA_PATH, function(err, data) {
	  			if (err) {
	  				reject(err);
	  			} else {
	  				resolve(data);
	  			}
	  		})
	  	})
	  	.then((fileData) => {
	  		return new Promise((resolve, reject) => {
	  			recognize.solving(fileData, function(err, id, code) {
	  				if (err) {
	  					reject(err);
	  				} else {
	  					resolve({id: id, code: code});
	  				}
	  			})
	  		});
	  	})
	  	.then((data) => {
	  		console.log(data);
	        if(data["code"]) {
	        	data["status"] = true
	        	return data
	        } else {
	            recognize.report(data["id"], function(err, answer) {
	                console.log(answer);
		            
		            data["status"] = false
		        	return data
	            });
	        }
	  	})
		.catch((error) => {
			return {
        		status: false
        	};
		});
		
		console.log("-----------");
		console.log(captchaCode);
		
		if (captchaCode["status"]) {
			// input captcha code
		    await this.page.type(inputEl, captchaCode["code"]);
		    await Promise.all([
		        this.page.click(submitEl),
		        this.page.waitForNavigation({
		            waitUntil: 'networkidle0',
		        }),
		    ]);

		    // Check if captcha is still exist
		    if (await this.checkCaptchaExist) {
		    	console.log("STILL EXIST");
		    	recognize.report(captchaCode["id"], function(err, answer) {
	                console.log(answer);
	            });
	    		return false; // incorrect captchaCode
		    } else {
		    	return true; // correct captchaCode
		    }
		} else {
			// cannot solve captcha
			return false;
		}
	}
}

async function run() {
	let browser = new ParseBrowser();
	await browser.run();
}


const argv = require('minimist')(process.argv.slice(2));

for(let arg of AVAILABLE_ARGS) {
    if(arg in argv) {
    	URL_PARTS[arg] = argv[arg];
    }
}

run();