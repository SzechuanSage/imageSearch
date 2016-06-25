var path = require('path')
var express = require('express')
var https = require('https')

var router = express()

var searches = []
const MAX_LATEST_SEARCH_COUNT = 10
const DATE_SEPARATOR = '-'
const TIME_SEPARATOR = ':'

router.use(express.static(path.resolve(__dirname, 'imageSearch')))

router.get('/latest', function(req, res) {
    var output = []
    searches.forEach(function(x) { output.unshift(x); })
    res.end(JSON.stringify(output))
})

router.get('/search/*', function(req, res) {
    var phrase = req.params[0]
    var searchUrl = req.url.slice(8)
    var offset = 1 + parseInt(req.query.offset)
    if (isNaN(offset))
        offset = 1

    var options = {
        hostname: 'api.gettyimages.com',
        port: 443,
        path: '/v3/search/images?phrase='+phrase+'&page='+offset+'&page_size=10',
        method: 'GET',
        headers: {
            'Api-Key': 'pkyrnqn6888dseskcbjcd5uv'
        }
    }
    
    var gettyReq = https.get(options, function(gettyRes) {
        handleGettyResponse(gettyRes, res)
    })
    
    gettyReq.on('error', function(e) {
        res.end(e)
    })

    var handleGettyResponse = function(gettyResponse, res) {
        var chunks = []
        gettyResponse.setEncoding('utf8')
        gettyResponse.on('data', function(chunk) {
            chunks.push(chunk)
        }) 
        gettyResponse.on('end', function(chunk) {
            var body = chunks.join();
            var details = getDetails(JSON.parse(body))
            res.end(JSON.stringify(details))
        })
        storeSearch()
    }
    
    var getDetails = function(data) {
        var result = []
        var images = data.images
        for (var i in images) {
            result.push({
                'id': images[i]['id'],
                'uri': images[i]['display_sizes'][0]['uri'],
                'title': images[i]['title']
            })
        }
        return result
    }
    
    var storeSearch = function() {
        var date = new Date()
        var time = date.getFullYear() + DATE_SEPARATOR +
            ('0' + (date.getMonth() + 1)).slice(-2) + DATE_SEPARATOR +
            ('0' + date.getDate()).slice(-2) + ' ' +
            ('0' + date.getHours()).slice(-2) + TIME_SEPARATOR +
            ('0' + date.getMinutes()).slice(-2) + TIME_SEPARATOR +
            ('0' + date.getSeconds()).slice(-2)
        searches.push({
            'query': searchUrl,
            'time': time
        })
        if (searches.length > MAX_LATEST_SEARCH_COUNT)
            searches.shift()
    }
})

router.listen(process.env.PORT || 3000);
