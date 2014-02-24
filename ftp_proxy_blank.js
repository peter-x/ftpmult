var ftpd = require('./ftpmult.js');

/*create server on ftp login attempt*/
var server = new ftpd.FtpServer({
    getHostFromUsername: function(username) {
		/*insert code here to determine hostname from username*/
		return {hostname: "192.168.0.20", port: 21}
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

