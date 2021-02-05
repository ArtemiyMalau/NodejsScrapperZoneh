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
let CUR_PAGE = 0;

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
        await this.page.setDefaultNavigationTimeout(20000);
        this.page.setUserAgent(this.userAgent);

		let previous_page;
        do {
        	previous_page = CUR_PAGE;

        	await this.parse(construct_url(URL, URL_PARTS));
        	URL_PARTS["page"] += 1;
        } while (CUR_PAGE != previous_page);

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

    	this.parseTable();
    }

    async parseTable() {
    	let trArr = [];
    	trEls = await this.page.$$("#ldeface > tbody > tr");
    	for (let tr of trEls) {
    		trArr.push(tr);
    	}
    	trArr = trArr.slice(1, -2);
    	console.log(trArr);
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