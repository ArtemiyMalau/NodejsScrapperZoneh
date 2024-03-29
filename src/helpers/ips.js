// Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const axios = require('axios');
const BigInteger = require("jsbn").BigInteger;
const cheerio = require("cheerio");
const fs = require('fs');
const IPCIDR = require("ip-cidr");
const os = require('os');
const URL = require('url');

import * as helpers from "./common.js";


const IPv4ToInt32 = (ip) => ip.split(".").reduce((r, e) => r * 256 + parseInt(e));

async function getCityIpRanges(city) {
	let cityInfo = await getCityByName(city);
	
	if (cityInfo) {
		let ipRanges = await getIpRange([
			{cityid: cityInfo["id_net"], base: "net"}, 
			{cityid: cityInfo["id_nic"], base: "nic"},
		]);
		return ipRanges;
	} else {
		return [];
	}
}

async function getCityByName(city) {
	let url = new URL.URL("https://4it.me/api/getcitylist");
	url.searchParams.set("city", city);

	let resp = await axios.get(url.href);

	if (resp.data) {
		let data = resp.data[0];
		return {
			id_net: data["id_net"],
			id_nic: data["id_nic"],
			name_ru: data["name_ru"],
		}
	} else {
		return false;
	}
}

async function getIpRange(cities) {
	let url = new URL.URL("https://4it.me/api/getlistip");

	let ipRange = [];
	for (let city of cities) {
		url.searchParams.set("cityid", city["cityid"]);
		url.searchParams.set("base", city["base"]);

		let resp = await axios.get(url.href);

		for (let range of resp.data) {
			ipRange.push(range);
		}
	}

	return ipRange;
}

async function getIpRangesFromIPv4File(filepath) {
	let content = fs.readFileSync(filepath, "utf-8");
	let lines = content.split(os.EOL);

	const result = lines.map(line => {
		let range = line.split("-").map(IPv4ToInt32);
		return {
			b: range[0],
			e: range[1],
		}
	});

	return result;
}

async function getIpRangesFromCIDRFile(filepath) {
	let content = fs.readFileSync(filepath, "utf-8");
	let lines = content.split(os.EOL);

	const ipRanges = lines.map(ipCidr => {
		if(IPCIDR.isValidAddress(ipCidr)) {
			const cidr = new IPCIDR(ipCidr); 

			return {
				b: cidr.start({ type: "bigInteger" }).intValue(),
				e: cidr.end({ type: "bigInteger" }).intValue(),
			}
		}
	});

	return ipRanges;
}

function checkIpIntInRange(ipInt, ipIntStart, ipIntEnd) {
	if (ipInt > ipIntStart && ipInt <= ipIntEnd) {
		return true;
	}
	return false;
};


class GeoData {
	constructor() {
		this.geoInfo = new Object();
		this.geoFuncs = [this.getLocationIpApiCom, this.getLocationGeoIpLookup];
	}

	async geoByIp(ip) {
		if (ip in this.geoInfo) {
			return this.geoInfo[ip];
		} else {
			for (let geoFunc of this.geoFuncs) {
				let geo = await geoFunc(ip);
				if (geo !== false) {
					this.geoInfo[ip] = geo;
					return this.geoInfo[ip];
				}
			}

			this.geoInfo[ip] = {city: "", country: ""};
			return this.geoInfo[ip];
		}
	}

	async getLocationIpApiCom(ip) {
		let resp = await axios.get(`http://ip-api.com/json/${ip}`);

		try {
			if ("country" in resp.data && "city" in resp.data) {
				return {
					city: json_resp["city"], 
					country: json_resp["country"]
				}
			} else {
				return false;	
			}
		} catch (e) {
			return false;
		}
	}

	async getLocationGeoIpLookup(ip) {
		let resp = await axios.get(`http://api.geoiplookup.net/?query=${ip}`);

		try {
			const $ = cheerio.load(resp.data);

			return {
				city: $("city").text().trim(),
				country: $("countryname").text().trim()
			}
		} catch (e) {
			return false;
		}
	}
}
	

export {GeoData, IPv4ToInt32, getCityIpRanges, getIpRangesFromIPv4File, getIpRangesFromCIDRFile, checkIpIntInRange}