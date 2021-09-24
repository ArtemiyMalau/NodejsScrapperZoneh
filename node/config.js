const RUCAPTCHA_KEY = "e8a91d251bc4371bf64ad108e2f15351";

const REQUIRED_IPS = [];

const SITE = "https://zone-h.org";
const URL = `${SITE}/archive?`;
const URL_ARGS = {
	"filter": 1,
	"domain": "",
	"fulltext": 1,
	"page": 1
}

const CAPTCHA_PATH = "captcha.jpeg";
const SOLVE_CAPTCHA_ATTEMPTS = 5;

const AVAILABLE_ARGS = ["city_ip_name", "ip_file", "domain", "page", "output_file"];
const AVAILABLE_URL_ARGS = ["domain", "page"];

const OUTPUT_FILE = "output.csv";


export {RUCAPTCHA_KEY, REQUIRED_IPS, SITE, URL, URL_ARGS, CAPTCHA_PATH, SOLVE_CAPTCHA_ATTEMPTS, AVAILABLE_ARGS, AVAILABLE_URL_ARGS, OUTPUT_FILE}