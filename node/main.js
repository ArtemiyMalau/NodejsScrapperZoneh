const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const config = require("./config");
const ips = require("./helpers/ips");
const ParseBrowser = require("./parser");


async function parse_argv() {
	const argv = require('minimist')(process.argv.slice(2));

	console.log(`Passed args:`, argv);
	// console.log(argv);
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

	const csvWriter = createCsvWriter({
		path: config.OUTPUT_FILE,
		// id field represents key in associate array, title field represent column header name in csv file
		header: [
			{
				id: "time", title: "time",
			},
			{
				id: "notifier", title: "notifier",
			},
			{
				id: "os", title: "os",
			},
			{
				id: "view", title: "view",
			},
			{
				id: "ip", title: "ip",
			},
			{
				id: "domain", title: "domain",
			},
			{
				id: "hackLink", title: "hack_link",
			},
		],
		append: fs.existsSync(config.OUTPUT_FILE)
	});

	let browser = new ParseBrowser(config);
	let parseData = await browser.run();

	await csvWriter.writeRecords(parseData);

}

run();