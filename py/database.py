import mysql.connector

from config import config

connection = mysql.connector.connect(**config["db"])

cursor = connection.cursor(dictionary=True)