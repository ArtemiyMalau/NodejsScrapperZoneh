const cheerio = require("cheerio");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const puppeteer = require('puppeteer');
const Recognize = require('recognize');

const config = require("./config");
const helpers = require("./helpers/common.js");
const ips = require("./helpers/ips.js");


class ParseBrowser {
    constructor() {
        this.browserOptions = {
        	headless: true
        };
        this.pageOptions = {
        	timeout: 12500
        };
        this.userAgent = "Mozilla/6.0 (Windows NT 6.1; Win64; x64; rv:81.0) Gecko/20100101 Firefox/81.0";
    }

    // Add optional insert function, which starts every parsed page. Pass in function parseData list and then clear them.
    async run(csvWriter) {
        console.log(">> Start browser");
        this.browser = await puppeteer.launch(this.browserOptions);
        this.page = await this.browser.newPage();
        this.page.setUserAgent(this.userAgent);

        let parseData = [];
        try {
	        let previous_page = config.URL_ARGS["page"] - 1;
	       	while (true) {
        		const pageContent = await this.getPageContent(helpers.constructUrl(config.URL, config.URL_ARGS));
        		if (!pageContent) {
	       			continue;
        		}

	        	let parseTableResp = this.parseTable(pageContent);

	       		if (previous_page >= parseTableResp["page"]) {
	       			break;
	       		} else {
	       			// Update page number
		       		config.URL_ARGS["page"] += 1;
		       		previous_page = parseTableResp["page"];

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
						if (config.REQUIRED_IPS.length > 0) {
							let ipInt = ips.IPv4ToInt32(parseTableResp["table"][i]["ip"]);
							for (range of config.REQUIRED_IPS) {
								if (helpers.checkIpIntInRange(ipInt, range["b"], range["e"])) {
									parseData.push(parseTableResp["table"][i]);
									console.log("DOMAIN IN IP RANGE");
									break;
								}
							}
						} else {
							parseData.push(parseTableResp["table"][i]);
						}

		    		}

		    		// Appending parsed data to csv file
		    		await csvWriter.writeRecords(parseData);
					parseData = [];
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
			row["notifier"] = `${config.SITE}${helpers.getHref($(tr).find("td:nth-child(2)"))}`;
			row["os"] = helpers.getClearText($(tr).find("td:nth-child(9)"));
			row["view"] = `${config.SITE}${helpers.getHref($(tr).find("td:nth-child(10)"))}`;

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
	    	if (attempts == config.SOLVE_CAPTCHA_ATTEMPTS) {
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
	  	await captcha.screenshot({path: config.CAPTCHA_PATH});

	  	// create recognize instance
	  	var recognize = new Recognize('rucaptcha', {
		    key: config.PROJECT_CONFIG["rucaptcha"]["api_key"]
		});

	  	// get captcha solve code
	  	let captchaCode = await helpers.readFilePromise(config.CAPTCHA_PATH)
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


async function parse_argv() {
	const argv = require('minimist')(process.argv.slice(2));

	console.log(`Passed args:`);
	console.log(argv);
	for(let arg of config.AVAILABLE_URL_ARGS) {
	    if (arg in argv) {
	    	config.URL_ARGS[arg] = argv[arg];
	    }
	}

	if (argv.city_ip_name) {
		let ipRanges = await ips.getCityIpRanges(argv.city_ip_name);
		console.log(`IPs from city ip ranges: ${ipRanges.length}`);
		config.REQUIRED_IPS = config.REQUIRED_IPS.concat(ipRanges);
	}
	if (argv.ip_file) {
		let ipRanges = await ips.getIpRangesFromIPv4File(argv.ip_file);
		console.log(`IPs from IPv4 file: ${ipRanges.length}`);
		config.REQUIRED_IPS = config.REQUIRED_IPS.concat(ipRanges);
	}
}


async function run() {
	await parse_argv()
	console.log(config);


	let browser = new ParseBrowser();
	await browser.run(csvWriter);
}


const csvWriter = createCsvWriter({
	path: "output.csv",
	header: [
		{
			id: "time", title: "Время сканирования",
		},
		{
			id: "notifier", title: "Взломщик",
		},
		{
			id: "os", title: "ОС",
		},
		{
			id: "view", title: "Ссылка",
		},
		{
			id: "ip", title: "IP сайта",
		},
		{
			id: "domain", title: "Домен сайта",
		},
		{
			id: "hackLink", title: "След взлома",
		},
	]
});

run(csvWriter);