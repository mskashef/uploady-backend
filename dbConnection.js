var mysql = require('mysql');

var connection = () => mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "uploady"
});

module.exports = connection;
