import requests
import requests_cache
import json
import feedparser

# requests_cache.install_cache('arty-medium-feed')

result = requests.get('https://medium.com/feed/@prozacchiwawa')
feeddata = feedparser.parse(result.text)
entries = []
out = {'entries':entries}
for e in feeddata.entries:
    entries.append({'title':e.title, 'link':e.link, 'published':e.published})
print 'Content-Type: text/json\r\n\r\n%s' % json.dumps(out)
