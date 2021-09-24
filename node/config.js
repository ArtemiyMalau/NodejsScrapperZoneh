exports.RUCAPTCHA_KEY = "e8a91d251bc4371bf64ad108e2f15351";

exports.REQUIRED_IPS = [];

exports.SITE = "https://zone-h.org";
exports.URL = `${exports.SITE}/archive?`;
exports.URL_ARGS = {
	"filter": 1,
	"domain": "",
	"fulltext": 1,
	"page": 1
}

exports.CAPTCHA_PATH = "captcha.jpeg";
exports.SOLVE_CAPTCHA_ATTEMPTS = 5;

exports.AVAILABLE_ARGS = ["city_ip_name", "ip_file", "domain", "page", "output_file"];
exports.AVAILABLE_URL_ARGS = ["domain", "page"];

exports.OUTPUT_FILE = "output.csv";