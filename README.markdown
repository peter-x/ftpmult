ftpmult - a simple FTP multiplexer / reverse proxy written in Node.JS
====

(Roughly) based on https://github.com/alanszlosek/nodeftpd and https://github.com/billywhizz/nodeftpd

Welcome
----

THIS IS A FORK OF https://github.com/peter-x/ftpmult

IMPROVED BY https://github.com/djpimp2010/ftpmult

This piece of software provides a reverse proxy for FTP which can select the
target server based on the username. This is for example useful in a hosting
environment where you have many virtual servers but only a single IP address and
do not want to use different ports for different virtual servers. All other
reverse proxy servers I know either do not provide target server selection at
all or only based on some suffix ("`@hostname`") of the username. Furthermore,
ftpmult is an extremely simple piece of software (less than 300 lines) and can
thus be easily adapted to your needs.

THIS SERVICE INIT SCRIPT HAS BEEN DESIGNED ON THE PRETENSE THAT NODE JS ONLY RUNS FOR THIS PROGRAM
IF YOU HAVE OTHER PROGRAMS RUNNING NODE.JS YOU WILL NEED TO IMPROVE THE SERVICE INIT SCRIPT


How to use
----

(THIS GUIDE IS BASED ON CentOS/Fedora)

1. Once the repo is cloned into your node.js modules directory, you will need to copy 'ftpproxy.initscript' to /etc/init.d
	(Or your 'service' script location, for other distros)

2. Edit ftpproxy.initscript and set the two variables at the top:
	NODE_EXECUTABLE_PATH=/usr/local/bin/node
	NODE_MODULES_PATH=/usr/local/bin/lib/node_modules/npm/node_modules

3. Rename file from ftpproxy.initscript to ftpproxy, and chmod with executable permissions for root.

4. Decide if you are going to be using a database to manage users/hosts.
	If you are, the database must have these fields:
	'increment_name' (primary key, auto increment) *name can vary*
	'username' (varchar)
	'host' (varchar)

	You can have other fields too, as long as each row is unique, and the fields username and host are present.
	This could be linked into a pre-existent user management database.

5. If you are using a database to manage users, and your database is set up, you should be ready to test the script.
	# service ftpproxy start

	If there are any errors, they will be listed in the console window.
	If you see the message "FTP multiplexer up and ready for connections." then your server is listening.
	
If you decided not to use mysql to manage users, please rename 'ftp_proxy.js' to 'ftp_proxy.js.old',
And then rename 'ftp_proxy_blank.js' to 'ftp_proxy.js'
This is a template file for creating a proxy server, although this has no function written for getting hostname from username.
