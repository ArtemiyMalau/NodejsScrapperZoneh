const fs = require("fs");

const config_path = "config.json";

if (!fs.existsSync(config_path)) {
    throw new Exception("config file doesn't exist");
} else {
	const config_data = fs.readFileSync(config_path);
	const config = JSON.parse(config_data);

	module.exports = config;	
}

