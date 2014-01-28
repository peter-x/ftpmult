var ftpd = require('./ftpmult.js');

try {
    process.setuid(0);
    process.setgid(0);
} catch (e) {
}

var server = new ftpd.FtpServer({
    getHostFromUsername: function(username) {
        return {hostname: 'protexneu.cnc-nt.de', port: 21};
    }
});

server.logLevel = 5;
server.listen(21);
server.server.on("error", function() {
    /* better exit so that someone can restart us */
    process.exit(1);
});
