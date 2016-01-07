# Github Webhook for Brownbaglunch

This project uses NodeJS to listen to [Github Push Events](https://developer.github.com/v3/activity/events/types/#pushevent).

Each time something is pushed on [bblfr_data](https://github.com/brownbaglunch/bblfr_data), this NodeJS application:

* fetch https://github.com/brownbaglunch/bblfr_data/blob/gh-pages/baggers.js
* split `data` in `baggers` and `cities`
* enrich `baggers.cities` with geo location point and image of the associated city
* index `baggers` and `cities` in elasticsearch. The index name is timestamped.
* move or create alias `bblfr` on the index name
* remove the old index

Data are available in elasticsearch:

* [baggers](http://localhost:9200/bblfr/baggers/_search?pretty)
* [cities](http://localhost:9200/bblfr/cities/_search?pretty)

If you want to push to another cluster, you need to create a local `config.json` file as follow:

```json
{
	"source": "https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js",
	"target": "https://username:password@yourcluster.found.io:9243/",
	"alias": "bblfr"
}
```

