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

## Run

To run it, you need to have Node JS installed.

```sh
git clone https://github.com/brownbaglunch/webhook.git
cd webhook
npm install
node app.js 
```

It should says:

```
Brownbaglunch webhook app listening at http://:::5000
elasticsearch cluster is running!
```

Then just POST to http://localhost:5000:

```sh
curl -XPOST localhost:5000
```

## Configuration

If you want to push to another cluster, you need to create a local `.env` file as follow:

```properties
SOURCE=https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js
TARGET=https://username:password@yourcluster.found.io:9243/
ALIAS=bblfr
TOKEN=hhdquiHdsuqiudshqhiudhuebefbbcbzbczib
PORT=5000
```

`TOKEN` value is the one you defined in [Github Hooks](https://github.com/brownbaglunch/bblfr_data/settings/hooks/).
It can be `null` (default) in development mode.

If you want to change network settings, change `PORT` system variables or change it in `.env` file:

```sh
PORT=9000 node app.js
```

By default, it will listen on `0.0.0.0`, port `5000`.

## Development

NodeMon is recommended when you want to code:

```sh
npm install nodemon -g
```

To monitor and restart your application automatically, run:

```sh
nodemon app.js
```

## Deployment

### Clevercloud

Connect to your [Clever-cloud console](https://console.clever-cloud.com/).
Create your NodeJS application and define your variables:

```sh
SOURCE=https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js
TARGET=http://bblfr:password@localhost:9200
ALIAS=bblfr
TOKEN=12345678
PORT=8080
```

Note that `PORT` **must be** `8080`.

Add clever as a git remote repository (change `ID` below):

```ssh
git remote add clever git+ssh://git@push.par.clever-cloud.com/app_ID.git
```

Deploy!

```sh
git push -u clever master
```

Et voilà!

### Heroku

You need to use the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-command):

```sh
brew install heroku
```

Log in to Heroku:

```sh
heroku login
```

To deploy on Heroku, create the Heroku application. It will basically create an Heroku application and 
add an "heroku" remote to your local git repository:

```sh
heroku create brownbaglunch-webhook
```

To deploy, run:

```sh
git add .
git push heroku master
```

Make sure you define needed system properties:

```sh
heroku config:set SOURCE=https://raw.githubusercontent.com/brownbaglunch/bblfr_data/gh-pages/baggers.js
heroku config:set TARGET=http://bblfr:password@localhost:9200
heroku config:set ALIAS=bblfr
heroku config:set TOKEN=12345678
heroku config:set PORT=5000
```


### DIY server

When running in production, you can use [forever](https://github.com/nodejitsu/forever) to run it as a service.

```sh
sudo npm -g install forever
sudo npm install -g forever-service
git clone https://github.com/brownbaglunch/webhook.git
cd webhook
npm install
# This will install webhook as a service
sudo forever-service install -e "PORT=5000" webhook
```

And start it:

```sh
sudo service webhook start
```

Or stop it:

```sh
sudo service webhook stop
```

To check if it's running:

```sh
sudo service webhook status
```

You can also check logs:

```sh
tail -f /var/log/webhook.log
```



