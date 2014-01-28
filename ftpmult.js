var net = require('net');
var util = require('util');


function FtpServer(options) {
    var self = this;

    if (!(this instanceof FtpServer)) {
        return new FtpServer(options);
    }

    this.myHost = options.host || '127.0.0.1';
    this.server = net.createServer();
    this.getHostFromUsername = options.getHostFromUsername || function(username) { return null; };
    this.logLevel = options.logLevel || 0;

    function log(level, message, isError) {
        if (self.logLevel < level)
            return;

        var now = new Date();
        var dateStr = now.getFullYear() + "-" + (1 + now.getMonth()) + "-" + now.getDate() + " " +
                      now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
        console.log(dateStr + " " + message);

        if (isError)
            console.trace("Trace follows");
    };

    this.server.on("error", function (err) {
        log(0, "Server error: " + err);
    });
    this.server.on("listening", function() {
        log(0, "FTP multiplexer up and ready for connections.");
    });
    this.server.on("connection", function(clientSocket) {
        var conn = {
            clientSocket: clientSocket,
            serverSocket: null,
            serverGreetingRecieved: false,
            log: function(level, message, isError) {
                log(level, clientSocket.remoteAddress + ': ' + message, isError);
            },
            destination: null
        }

        clientSocket.setEncoding("ascii");
        clientSocket.setNoDelay();

        conn.log(1, "Client connected.");
        clientSocket.write("220 FTP multiplexer ready\r\n");
        
        clientSocket.on("end", function() {
            conn.log(1, "Client disconnected.");
        });
        clientSocket.on("error", function(err) {
            conn.log(0, "Client connection error: " + err);
            clientSocket.destroy();
        });
        clientSocket.on("data", handleClientData);

        function parseFTPCommand(data) {
            var m = (data + '').match(/\s*(\S*)(\s+(.*\S))?\s*/);
            if (!m) {
                return {cmd: '', arg: ''};
            } else {
                return {cmd: m[1], arg: m[3]};
            }
        }

        function parseServerResponse(data) {
            var m = (data + '').match(/\s*(\d{1,3})([\s-]+(.*\S))?\s*/);
            if (!m) {
                return {cmd: '', arg: ''};
            } else {
                return {cmd: m[1], arg: m[3]};
            }
        }

        function forwardPassiveConnection(host, port, callback) {
            conn.log(0, "Establishing forward for passive connection (" + host + ":" + port + ")");

            var listenPort = null;
            var serverConnected = false;
            var clientConnected = false;

            var psvListener = net.createServer(function(lsocket) {
                if (clientConnected) {
                    lsocket.end();
                } else {
                    conn.log(4, "Client connected to forwarder.");
                    clientConnected = true;
                    psvListener.close();

                    lsocket.on('error', function(err) {
                        conn.log(0, "Passive forwarding error: " + err, conn);
                        lsocket.destroy();
                    });

                    lsocket.pipe(serverConn);
                    serverConn.pipe(lsocket);
                }
            });
            psvListener.listen(0, function() {
                conn.log(4, "Listening for client.");
                listenPort = psvListener.address().port;
                tryNotifyingClient();
            });
            psvListener.on('error', function(err) {
                conn.log(0, "Passive listener error: " + err, conn);
                psvListener.destroy();
            });
            var serverConn = net.createConnection(port, host, function() {
                conn.log(4, "Connected to server.");
                serverConnected = true;
                tryNotifyingClient();
            });
            serverConn.on('error', function(err) {
                conn.log(0, "Passive forwarding error: " + err, conn);
                serverConn.destroy();
            });


            function tryNotifyingClient() {
                if (listenPort === null || !serverConnected)
                    return;
                conn.log(4, "Forwarder established, notifying client.");
                callback(self.myHost, listenPort);
            }
        }
        
        function handleClientData(data) {
            // Don't want to include passwords in logs.
            conn.log(2, "Client command:  " + (data + '').trim().toString('utf-8').replace(/^PASS\s+.*/, 'PASS ***'));

            if (conn.serverSocket !== null) {
                conn.serverSocket.write(data);
                return;
            }

            var command = parseFTPCommand(data);

            if (command.cmd !== "USER") {
                clientSocket.write("202 Not supported\r\n");
                return;
            }

            conn.destination = self.getHostFromUsername(command.arg);
            if (conn.destination === null) {
                clientSocket.write("530 Invalid username\r\n");
                clientSocket.close();
                return;
            }

            conn.serverSocket = net.createConnection(conn.destination.port, conn.destination.hostname);
            conn.serverSocket.setEncoding('ascii');
            conn.serverSocket.setNoDelay();
            conn.serverSocket.on('connect', function() {
                conn.serverSocket.write(data);
            });
            conn.serverSocket.on('data', function(data) {
                data.split('\r\n').forEach(function(data) {
                    if ((data + '').trim()) {
                        handleServerResponse(data + '\r\n');
                    }
                });
            });
            conn.serverSocket.on('end', function() {
                clientSocket.end();
            });
            conn.serverSocket.on('error', function(err) {
                conn.log(0, "Error from server connection: " + err);
                clientSocket.end();
            });
        }

        function handleServerResponse(data) {
            conn.log(2, "Server response: " + (data + '').trim().toString('utf-8'));

            var command = parseServerResponse(data);

            if (!conn.serverGreetingRecieved) {
               if (command.cmd === "220") {
                    /* suppress "welcome"-message, wait for the answer to
                    * the USER-command */
                    conn.log(4, "Response suppressed.");
                    return;
               } else {
                   conn.serverGreetingRecieved = true;
               }
            } else if (command.cmd === "227") {
                /* intercept passive mode */
                conn.log(3, "Trying to intercept passive mode.");
                var m = command.arg.match(/.*\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3})\).*/);
                if (m) {
                    var hostname = m[1] + '.' + m[2] + '.' + m[3] + '.' + m[4];
                    var port = parseInt(m[5]) * 256 + parseInt(m[6]);
                    forwardPassiveConnection(hostname, port, function(localHost, localPort) {
                        var i1 = parseInt(localPort / 256);
                        var i2 = parseInt(localPort % 256);
                        conn.log(0, "227 Entering Passive Mode (" + localHost.split(".").join(",") + "," + i1 + "," + i2 + ")");
                        clientSocket.write("227 Entering Passive Mode (" + localHost.split(".").join(",") + "," + i1 + "," + i2 + ")\r\n");
                    });
                    return;
                } else {
                    conn.log(1, "Unable to parse PASV address.");
                }
            } else if (command.cmd === "229") {
                conn.log(3, "Trying to intercept extended passive mode.");
                var m = command.arg.match(/.*\(\|\|\|(\d{1,5})\|\).*/);
                if (m) {
                    forwardPassiveConnection(conn.destination.hostname, port, function(localHost, localPort) {
                        conn.log(0, "229 Entering Passive Mode (|||" + localPort + "|)");
                        clientSocket.write("229 Entering Passive Mode (|||" + localPort + "|)\r\n");
                    });
                    return;
                } else {
                    conn.log(1, "Unable to parse EPASV address.");
                }
            }

            clientSocket.write(data);
        }
    });

    this.server.on("close", function() {
        log(0, "Server closed");
    });
}

["listen", "close"].forEach(function (fname) {
    FtpServer.prototype[fname] = function () {
        return this.server[fname].apply(this.server, arguments);
    }
});

exports.FtpServer = FtpServer;
