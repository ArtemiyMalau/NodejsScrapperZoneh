const config = require("./config");
const helpers = require("./helpers/common.js");
const connection = require("./database.js");

const Recognize = require('recognize');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cheerio = require("cheerio");

const SITE = "https://zone-h.org";
const URL = "https://zone-h.org/archive?";
let URL_ARGS = {
	"filter": 1,
	"domain": "",
	"fulltext": 1,
	"page": 1
}
const AVAILABLE_ARGS = ["domain"];

const CAPTCHA_PATH = "captcha.jpeg";
const SOLVE_CAPTCHA_ATTEMPTS = 5;


class ParseBrowser {
    constructor() {
        this.browserOptions = {
        	headless: false
        };
        this.pageOptions = {
        	timeout: 7500
        }
        this.userAgent = "Mozilla/6.0 (Windows NT 6.1; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0";
    }

    async run() {
        console.log(">> Start browser");
        this.browser = await puppeteer.launch(this.browserOptions);
        this.page = await this.browser.newPage();
        this.page.setUserAgent(this.userAgent);

        let parseData = [];
        try {
	        let previous_page = URL_ARGS["page"] - 1;
	       	while (true) {
	        	const pageContent = await this.getPageContent(helpers.constructUrl(URL, URL_ARGS));
	        	let parseTableResp = this.parseTable(pageContent);
	    		// for (let resp of parseTableResp["table"]) {
	    		// 	const pageContent = await this.getPageContent(resp["view"]);
	    		// 	let parseSiteResp = this.parseMirror(pageContent);
	    		// }
	    		for (let i in parseTableResp["table"]) {
	    			const pageContent = await this.getPageContent(parseTableResp["table"][i]["view"]);
	    			let parseSiteResp = this.parseMirror(pageContent);

	    			for (var key of Object.keys(parseSiteResp)) {
	    				parseTableResp["table"][i][key] = parseSiteResp[key];
					}
	    			console.log(parseTableResp["table"][i]);
	    		}

	       		if (previous_page == parseTableResp["page"]) {
	       			break;
	       		} else {
		       		parseData = parseData.concat(parseTableResp["table"]);
		       		URL_ARGS["page"] += 1;
		       		previous_page = parseTableResp["page"];
	       		}
	       	}
		} catch (e) {
			console.log(e);
		}
		console.log(">> Parsing ended");
     	this.browser.close();

     	return parseData;
    }
	
	parseMirror(pageContent) {
		const $ = cheerio.load(pageContent);

		let domain = helpers.getDomain($("li.deface0:nth-child(2) > ul:nth-child(1) > li:nth-child(2)"));
		let ip = helpers.getIp($("li.deface0:nth-child(2) > ul:nth-child(1) > li:nth-child(3)"));

		console.log(domain);
		console.log(ip);

		return {ip, domain}
	}

    parseTable(pageContent) {
    	const $ = cheerio.load(pageContent);

    	// define column names and value get method
    	let rowAttrs = [
    		{
    			name: "time",
    			value: helpers.getTimestamp
    		},
    		{
    			name: "notifier",
    			value: (el) => {return `${SITE}${helpers.getHref(el)}`}
    		},
    		{
    			name: "h",
    			value: (el) => {return el.text() ? true : false}
    		},
    		{
    			name: "m",
    			value: helpers.getHref
    		},
    		{
    			name: "r",
    			value: helpers.getHref
    		},
    		{
    			name: "l",
    			value: (el) => {return el.find("img").attr("alt")}
    		},
    		{
    			name: "starred",
    			value: (el) => {return el.find("img").attr("src") ? true : false}
    		},
    		{
    			name: "domain",
    			value: helpers.getClearText
    		},
    		{
    			name: "os",
    			value: helpers.getClearText
    		},
    		{
    			name: "view",
    			value: (el) => {return `${SITE}${helpers.getHref(el)}`}
    		}

    	]

		let trArr = [];

		// iterate over all table rows with needed data
		let trs = $("#ldeface > tbody > tr").slice(1, -2);
		trs.each((i, tr) => {
			// initialize row variable and 
			let row = {};
			
			$(tr).find("td").each((i, td) => {
				row[rowAttrs[i]["name"]] = rowAttrs[i]["value"]($(td));
			})

			trArr.push(row);
		})

		// get page number to decide whether need to parsing again
		let page = $("td.defacepages > strong").text();

		return {table: trArr, page}
    }

    async getPageContent(url) {
		console.log(`>> Scrapping ${url}`);
    	await this.page.goto(url, this.pageOptions);

    	// trying to solve captcha
    	let attempts = 0;
    	while (! await this.trySolveImageCaptcha("#cryptogram", "input[type=text][name*=captcha]", "input[type=submit]")) {
    		attempts += 1;
	    	if (attempts == SOLVE_CAPTCHA_ATTEMPTS) {
	    		return;
	    	}
    	}

    	// return page html
    	return this.page.content();
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
		    if (await this.checkCaptchaExist(captchaEl)) {
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

async function insertData(parseData) {
	console.log(">> Inserting parse data");
	insertRows = [];
	for (row of parseData) {
		insertRows.push([
			row["time"],
			row["domain"],
			row["os"],
			row["view"],
		])
		if (insertRows.length == 25) {
			await new Promise((resolve, reject) => {
				connection.query("INSERT INTO dump (time, domain, os, view) VALUES ?", [insertRows], (err, resp) => {
					if (err) {
						console.log(">> Error in sql insert");
						console.log(err);
					} else {
						console.log(`>> Inserted ${resp.affectedRows} records`);
					}
					resolve(insertRows = []);
				})
			})
		}
	}
	console.log(">> End of inserting");
}

async function run() {
	let browser = new ParseBrowser();
	let parseData = await browser.run();
	await insertData(parseData);

	connection.end((err) => {});
}

const argv = require('minimist')(process.argv.slice(2));

for(let arg of AVAILABLE_ARGS) {
    if(arg in argv) {
    	URL_ARGS[arg] = argv[arg];
    }
}

run();


// let a = {
// 	table: [
// 		{
// 			test: 1
// 		},
// 		{
// 			test: 2
// 		},
// 		{
// 			test: 3
// 		},
// 		{
// 			test: 4
// 		}
// 	]
// };

// for (item of a["table"]) {
// 	console.log(item["test"]);
// }