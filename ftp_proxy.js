var ftpd = require('./ftpmult.js');

/*function to check associative array for username, and return host*/
/*if username is not in array, return bad host, so that connection is refused*/
/*array example:
	users = [
		{ record_id: "1", username: "testuser1", host: "192.168.0.11" },
		{ record_id: "2", username: "testuser2", host: "192.168.0.12" },
		{ record_id: "3", username: "testuser3", host: "192.168.0.13" }
			];*/
Array.prototype.contains = function ( needle ) {
   for (i in this) {
	   if (this[i]['username'] === needle) return this[i]['host'];
   }
   return '10.32.0.1'; /*set this to an IP address not in your network*/
}

/*node.js mysql library required*/
/*npm install mysql*/
var mysql = require('mysql');
var connection = mysql.createConnection({
    	host    : '192.168.0.10',
    	user    : 'ftpproxy',
    	password: 'P4ssw0rd',
    	database: 'ftpproxy'
});

/*connect once on service start, and run query to get users*/
connection.connect(function(err){
    	if(err){
			console.log(err);
			return;
    	}
});

/*this query fetches all users from the table ftpproxy.users*/
connection.query('SELECT * from users', function(err, rows, fields) {
	if (err) {
		console.log(err);
		return;
    } else {
		/*store array in global scope, without declaring it as a 'var'*/
		users = rows;
	}
});

/*close mysql connection, as we now have array of users*/
connection.end();

/*create server on ftp login attempt*/
var server = new ftpd.FtpServer({
    getHostFromUsername: function(username) {
		var host = users.contains(username);
		return {hostname: host, port: 21}
    }
});

server.logLevel = 4;
/*listen on port 21 (command issued as root)*/
server.listen(21);
try {
	/*change uid/gid to non-root user*/
    process.setuid(65534);
    process.setgid(65534);
} catch (e) {
}
server.server.on("error", function() {
    /* better exit so that someone can restart us */
    process.exit(1);
});

