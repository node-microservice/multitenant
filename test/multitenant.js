var multiTenant = require('..');
var assert = require('assert');

var tenantObj = {
  company: 'Blabla Inc.',
  host: '143.89.123.8'
};

describe('multiTenant', function() {

  describe('.tenants', function() {

    it('is an object', function(done) {
      execute({
        tenants: {
          bla: tenantObj
        }
      }, done);
    });

    it('is a function', function(done) {
      execute({
        tenants: function(tenantId, done) {
          done(tenantObj);
        }
      }, done);
    });
  });

  describe('.parseTenantId', function() {

    it('is a function', function(done) {
      execute({
        parseTenantId: function(req, done) {
          if (req.subdomains.length === 0) {
            return done();
          }
          done(req.subdomains[req.subdomains.length - 1]);
        }
      }, done);
    });
  });

  describe('.onNotFound', function() {

    it('is a function', function(done) {
      execute({
        tenants: {},
        onNotFound: function(req, res) {
          res.send('tenant not found');
        }
      }, done, function(data) {
        assert.equal(data, 'tenant not found');
        done();
      });
    });
  });

  describe('.onNoTenantKey', function() {

    it('is a function', function(done) {
      execute({
        parseTenantId: function() {
          arguments[1]();
        },
        onNoTenantKey: function(req, res) {
          res.send('tenant key not found');
        }
      }, done, function(data) {
        assert.equal(data, 'tenant key not found');
        done();
      });
    });
  });

  describe('.connectionStrategy', function() {

    it('is a function', function(done) {
      execute({
        connectionStrategy: function(options, done) {
          done(options.host);
        }
      }, done, function(req, res) {
        assert.equal(req.tenantConnection, tenantObj.host);
        done();
      });
    });

    it('is an object', function(done) {
      execute({
        connectionStrategy: {
          tenantHost: function(tenant, done) {
            done(null, tenant.host);
          },
          tenantCompany: tenantObj.company
        }
      }, done, function(req, res) {
        assert.equal(req.tenantHost, tenantObj.host);
        assert.equal(req.tenantCompany, tenantObj.company);
        done();
      });
    });
  });
});


/*
 * Simulate for connect
 */
var execute = (function() {
  function Request() {
    // the order of subdomains is inverted
    this.subdomains = ['test', 'bla'];
  }

  function Response(sendCallback) {
    this.send = sendCallback || (function() {});
  }

  return function(object, done, assertion) {
    var args = object;

    args.tenants = args.tenants || {
      bla: tenantObj
    };

    var req = new Request();

    var res;
    if (typeof assertion === 'function') {
      res = new Response(assertion);
    } else {
      res = new Response();
    }

    multiTenant(args)(req, res, function() {
      if (typeof assertion === 'function') {
        assertion(req, res);
      } else {
        assert.equal(req.tenantConnection, tenantObj);
        done();
      }
    });
  }
})();
