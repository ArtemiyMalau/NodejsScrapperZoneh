const URL = require('url');

function constructUrl(url, urlArgs) {
	let newUrl = new URL.URL(`${url}?`);
	for (arg in urlArgs) {
		newUrl.searchParams.set(arg, urlArgs[arg]);
	}
	return newUrl.href;
}

function createAssociativeArray(arr1, arr2) {
    var arr = {};
    for(var i = 0, ii = arr1.length; i<ii; i++) {
        arr[arr1[i]] = arr2[i];
    }
    return arr;
}

function getHref(el) {
	let href = el.find("a").attr("href");
	if (href) {
		return href;
	} else {
		return false;
	}
}

function getClearText(el) {
	return el.text().replace(/\t/g, "").replace(/\n/g, "");
}

function getTimestamp(el) {
	let timeText = getClearText(el);
	found = timeText.match(/(\d{4})\/(\d{2})\/(\d{2})/);
	if (found) {
		var unixTimestamp = Math.round(new Date(`${found[1]}-${found[2]}-${found[3]} 00:00:00.000`)/1000);
		return unixTimestamp;
	} else {
		found = timeText.match(/(\d{2}):(\d{2})/);
		if (found) {
			var unixTimestamp = Math.round(new Date().setHours(24,0,0,0)/1000);
			return unixTimestamp;
		} else {
			return false;
		}
	}
}

function getIp(el) {
	let str = el.text();
	let ip = str.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)[0];

	return ip;
}

function getDomain(el) {
	let str = el.text();
	let strUrl = str.match(/(http.+)/)[0];

	let newUrl = new URL.URL(strUrl);

	return newUrl.origin;
}

exports.constructUrl = constructUrl;
exports.createAssociativeArray = createAssociativeArray;
exports.getHref = getHref;
exports.getClearText = getClearText;
exports.getTimestamp = getTimestamp;
exports.getIp = getIp;
exports.getDomain = getDomain;