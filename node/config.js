const fs = require("fs");

const config_path = "../config.json";

if (!fs.existsSync(config_path)) {
    throw new Exception("config file doesn't exist");
} else {
	const project_config = JSON.parse(fs.readFileSync(config_path));

	let module_exports = module.exports = {};

	module_exports.PROJECT_CONFIG = project_config;
	
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

	module_exports.AVAILABLE_ARGS = ["city_ip_name", "ip_file", "domain", "page"];
	module_exports.AVAILABLE_URL_ARGS = ["domain", "page"];
}