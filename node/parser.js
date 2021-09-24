const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const Recognize = require('recognize');

const ips = require("./helpers/ips");
const helpers = require('./common.js');


class ParseBrowser {
    constructor(config) {
        this.browserOptions = {
        	headless: true
        };
        this.pageOptions = {
        	timeout: 12500
        };
        this.userAgent = "Mozilla/6.0 (Windows NT 6.1; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0";

        this.config = config;
    }

	/**
	 * Parse data about hacked domains from zone-h.org website
	 * 		
	 * @return {array} csvWriter Configurated CsvWriter object used for pass parsed data into csv file.
	 */
    async run(dataHandler=false) {
        console.log(">> Start browser");
        this.browser = await puppeteer.launch(this.browserOptions);
        this.page = await this.browser.newPage();
        this.page.setUserAgent(this.userAgent);

        let parseData = await this.parseZoneH(dataHandler);

		console.log(">> Parsing ended");
     	this.browser.close();

     	return parseData;
    }

    async parseZoneH(dataHandler) {
        let parseData = [];

        try {
	        let previousPage = this.config.URL_ARGS["page"] - 1;
	       	while (true) {
        		const pageContent = await this.getPageContent(helpers.constructUrl(this.config.URL, this.config.URL_ARGS));
        		if (!pageContent) {
	       			continue;
        		}

	        	let parseTableResp = this.parseTable(pageContent);

	        	// End of table reached
	       		if (previousPage >= parseTableResp["page"]) {
	       			break;
	       		} else {
	       			let curPageData = [];

	       			// Update page number
		       		this.config.URL_ARGS["page"] += 1;
		       		previousPage = parseTableResp["page"];

		       		// Parse each row and put all data from row and mirrow together
		    		for (let i = 0; i < parseTableResp["table"].length; i++) {
		    			const pageContent = await this.getPageContent(parseTableResp["table"][i]["view"]);
		    			if (!pageContent) {
			       			continue;
		        		}

	    				let parseSiteResp = this.parseMirror(pageContent);
	    				
		    			// Insert additional fields in parse row
		    			parseTableResp["table"][i] = Object.assign(parseTableResp["table"][i], parseSiteResp);

		    			console.log(parseTableResp["table"][i]);

						// IpRange validation
						if (this.config.REQUIRED_IPS.length > 0) {
							let ipInt = ips.IPv4ToInt32(parseTableResp["table"][i]["ip"]);
							for (range of this.config.REQUIRED_IPS) {
								if (helpers.checkIpIntInRange(ipInt, range["b"], range["e"])) {
									curPageData.push(parseTableResp["table"][i]);
									console.log("DOMAIN IN IP RANGE");
									break;
								}
							}
						} else {
							curPageData.push(parseTableResp["table"][i]);
						}
		    		}

		    		if (dataHandler !== false) {
		    			dataHandler(curPageData);
		    		}

		    		parseData = parseData.concat(curPageData);
	       		}
	       	}
		} catch (e) {
			console.log(e);
		}

		return parseData;
    }
	
	parseMirror(pageContent) {
		const $ = cheerio.load(pageContent);

		let url = helpers.getUrl($("li.deface0:nth-child(2) > ul:nth-child(1) > li:nth-child(2)"));
		
		let domain = url.origin;
		let hackLink = url.href;
		let ip = helpers.getIp($("li.deface0:nth-child(2) > ul:nth-child(1) > li:nth-child(3)"));

		return {ip, domain, hackLink}
	}

    parseTable(pageContent) {
    	const $ = cheerio.load(pageContent);

		let trArr = [];

		// iterate over all table rows with needed data
		let trs = $("#ldeface > tbody > tr").slice(1, -2);
		trs.each((i, tr) => {
			let row = {};

			row["time"] = helpers.getTimestamp($(tr).find("td:nth-child(1)"));
			row["notifier"] = `${this.config.SITE}${helpers.getHref($(tr).find("td:nth-child(2)"))}`;
			row["os"] = helpers.getClearText($(tr).find("td:nth-child(9)"));
			row["view"] = `${this.config.SITE}${helpers.getHref($(tr).find("td:nth-child(10)"))}`;

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
	    	if (attempts == this.config.SOLVE_CAPTCHA_ATTEMPTS) {
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
	  	await captcha.screenshot({path: this.config.CAPTCHA_PATH});

	  	// create recognize instance
	  	var recognize = new Recognize('rucaptcha', {
		    key: this.config.RUCAPTCHA_KEY
		});

	  	// get captcha solve code
	  	let captchaCode = await helpers.readFilePromise(this.config.CAPTCHA_PATH)
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

module.exports = ParseBrowser;