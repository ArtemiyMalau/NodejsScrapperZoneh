from json import loads

config_path = "./config.json"
with open(config_path, "r") as file:
	config = loads(file.read())