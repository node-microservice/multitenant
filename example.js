var express = require('express');
var app = express();

var multiTenant = require('./index.js');

app.use(multiTenant({
  tenants: {
    bla: {
      company: 'Blabla Inc.',
      host: '143.89.123.8'
    }
  },
  parseTenantId: function(req, done) {
    if (req.subdomains.length === 0) {
      return done();
    }
    done(req.subdomains[req.subdomains.length - 1]);
  },
  onNotFound: function(req, res) {
    res.send('Company doesn\'t exists');
  },
  onNoTenantKey: function(req, res) {
    res.send('Welcome to test home page');
  },
  connectionStrategy: function(options, done) {
    done(options.host);
  }
}));


app.get('/', function(req, res) {
  res.json({
    tenant: req.tenantConnection
  });
});

app.listen(3000);
