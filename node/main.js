import dateFormat from "dateformat";

// Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

import * as config from "./config.js";
import * as ips from "./helpers/ips.js";
import {ParseBrowser} from "./parser.js";


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

async function test(dataHandler) {
	dataHandler([
			{
				time: 1632517200,
				notifier: 'https://zone-h.org/archive/notifier=.%252FKeyzNet',
				os: 'Linux',
				view: 'https://zone-h.org/mirror/id/36697573',
				ip: '116.202.175.242',
				domain: 'http://nigeriapropertyrentals.com',
				hackLink: 'http://nigeriapropertyrentals.com/407.html'
			},
			{
			  time: 1632517200,
			  notifier: 'https://zone-h.org/archive/notifier=chinafans',
			  os: 'Linux',
			  view: 'https://zone-h.org/mirror/id/36697568',
			  ip: '167.233.3.74',
			  domain: 'https://metod.rs',
			  hackLink: 'https://metod.rs/o.htm'
			},
			{
			  time: 1632517200,
			  notifier: 'https://zone-h.org/archive/notifier=.%252FKeyzNet',
			  os: 'Linux',
			  view: 'https://zone-h.org/mirror/id/36697567',
			  ip: '151.106.97.221',
			  domain: 'http://aakarinfraservices.com',
			  hackLink: 'http://aakarinfraservices.com/pwn3d.php'
			},
			{
			  time: 1632517200,
			  notifier: 'https://zone-h.org/archive/notifier=.%252FKeyzNet',
			  os: 'Linux',
			  view: 'https://zone-h.org/mirror/id/36697583',
			  ip: '151.106.97.221',
			  domain: 'http://godrejpropertiesindia.in',
			  hackLink: 'http://godrejpropertiesindia.in/pwn3d.php'
			}
		])

}

async function run() {
	await parse_argv()
	console.log(config);

	var geoData = new ips.GeoData();
	var csvWriter = createCsvWriter({
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
				id: "country", title: "country",
			},
			{
				id: "city", title: "city",
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
	await browser.run(async (parseData) => {
		console.log(parseData);

		let formattedParseData = await Promise.all(parseData.map(async (data) => {
			let geo = await geoData.geoByIp(data["ip"]);
			data["time"] = dateFormat(new Date(data["time"] * 1000), "MM:HH dd.mm.yyyy");
			
			return Object.assign({}, data, geo);
		}));

		await csvWriter.writeRecords(formattedParseData);
	});

}

run();