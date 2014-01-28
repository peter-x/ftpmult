var ftpd = require('./ftpmult.js');

try {
    process.setuid(65534);
    process.setgid(65534);
} catch (e) {
}

var server = new ftpd.FtpServer({
    getHostFromUsername: function(username) {
        return {hostname: 'ftp.kernel.org', port: 21};
    }
});

server.logLevel = 4;
server.listen(7002);
server.server.on("error", function() {
    /* better exit so that someone can restart us */
    process.exit(1);
});
