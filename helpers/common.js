const url = require('url');

function constructUrl(url, urlArgs) {
	let URL = new url.URL(`${url}?`);
	for (arg of urlArgs) {
		URL.searchParams.set(arg, urlArgs[arg]);
	}
	return URL.href;
}

exports.constructUrl = constructUrl;