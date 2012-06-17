ftpmult - a simple FTP multiplexer / reverse proxy written in Node.JS
====

(Roughly) based on https://github.com/alanszlosek/nodeftpd and https://github.com/billywhizz/nodeftpd

Welcome
----

This piece of software provides a reverse proxy for FTP which can select the
target server based on the username. This is for example useful in a hosting
environment where you have many virtual servers but only a single IP address and
do not want to use different ports for different virtual servers. All other
reverse proxy servers I know either do not provide target server selection at
all or only based on some suffix ("`@hostname`") of the username. Furthermore,
ftpmult is an extremely simple piece of software (less than 300 lines) and can
thus be easily adapted to your needs.


How to use
----

See `test.js` for an example and adjust the callback `getHostFromUsername` to your
needs.

