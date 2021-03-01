from datetime import datetime
import json
import pandas as pd
import requests
from bs4 import BeautifulSoup

from database import cursor, connection


class GeoData():
	def __init__(self):
		self.geo_data = dict()

	def geo_by_ip(self, ip):
		if ip in self.geo_data:
			return self.geo_data[ip]
		else:
			geo = self.get_ip_ipApiCom(ip)
			if geo:
				self.geo_data[ip] = geo
				return geo

			geo = self.get_ip_geoIpLookup(ip)
			if geo:
				self.geo_data[ip] = geo
				return geo

			self.geo_data[ip] = {"city": "", "country": ""}
			return self.geo_data[ip]

	def get_ip_ipApiCom(self, ip):
		url = f"http://ip-api.com/json/{ip}"
		try:
			resp = requests.get(url)
			json_resp = resp.json()

			if not json_resp["city"] and not json_resp["country"]:
				raise Exception("Empty response")
			else:
				return {"city": json_resp["city"], "country": json_resp["country"]}
				
		except (json.decoder.JSONDecodeError, requests.Timeout, requests.exceptions.ConnectionError, Exception) as e:
			print(e)
			return None

	def get_ip_geoIpLookup(self, ip):
		url = f"http://api.geoiplookup.net/?query={ip}"

		try:
			resp = requests.get(url)
			soup = BeautifulSoup(resp.text, 'lxml')

			country = soup.find("countryname").get_text(strip=True)
			city = soup.find("city").get_text(strip=True)

			if not city and not country:
				raise Exception("Empty response")
			else:
				return {"city": city, "country": country}

		except (requests.Timeout, requests.exceptions.ConnectionError, Exception) as e:
			return None


geoData = GeoData()

def convert_row(db_row):
	geo = geoData.geo_by_ip(db_row["ip"])
	print(geo)
	db_row["city"] = geo["city"]
	db_row["country"] = geo["country"]

	db_row["time"] = datetime.utcfromtimestamp(db_row["time"]).strftime("%Y-%m-%d")

	return db_row

def dump_csv(filename):
	cursor.execute("SELECT time, ip, domain, hackLink FROM dump WHERE IF(hackLink='',0,1) AND domain LIKE '%.ru%'")
	# cursor.execute("SELECT time, ip, domain, hackLink FROM dump")
	rows = list(map(convert_row, cursor.fetchall()))

	df = pd.DataFrame(rows)
	df.to_csv(filename, sep=';', encoding='utf-8', index=False)


dump_csv("test.csv")
