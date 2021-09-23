let module_exports = module.exports = {};

module_exports.RUCAPTCHA_KEY = "e8a91d251bc4371bf64ad108e2f15351";

module_exports.REQUIRED_IPS = [];

module_exports.SITE = "https://zone-h.org";
module_exports.URL = `${module_exports.SITE}/archive?`;
module_exports.URL_ARGS = {
	"filter": 1,
	"domain": "",
	"fulltext": 1,
	"page": 1
}

module_exports.CAPTCHA_PATH = "captcha.jpeg";
module_exports.SOLVE_CAPTCHA_ATTEMPTS = 5;

module_exports.AVAILABLE_ARGS = ["city_ip_name", "ip_file", "domain", "page", "output_file"];
module_exports.AVAILABLE_URL_ARGS = ["domain", "page"];

module_exports.OUTPUT_FILE = "output.csv";