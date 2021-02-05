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

exports.constructUrl = constructUrl;
exports.createAssociativeArray = createAssociativeArray;
exports.getHref = getHref;
exports.getClearText = getClearText;
exports.getTimestamp = getTimestamp;