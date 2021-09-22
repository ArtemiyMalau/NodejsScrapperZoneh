const mysql = require("mysql");
const config = require("./config");

var connection = mysql.createConnection(config.PROJECT_CONFIG["db"]);

connection.connect(function(err) {
    if (err) throw err;
});

module.exports = connection;