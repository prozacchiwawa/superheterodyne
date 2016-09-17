.SUFFIXES: .elm .elmx .js

all: js/index.js js/server.js

clean:
	rm -rf js/index.js js/server.js src/*.elm

%.elm: %.elmx
	node elmx.js $^ > $@

js/index.js: src/Arty.elm src/Main.elm
	elm make --output $@ $^

tmp/server.js: src/Arty.elm src/Server.elm
	elm make --output $@ $^

js/server.js: tmp/server.js
	sed -e 's/_eeue56$$elm_server_side_renderer/_prozacchiwawa$$superheterodyne/g' -e 's/'\''use strict'\'';/'\''use strict'\'';var document, window;/g' < tmp/server.js > $@
