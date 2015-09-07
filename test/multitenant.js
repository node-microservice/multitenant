var assert = require('assert'),
  context = require('request-context'),
  supertest = require('supertest-as-promised'),
  express = require('express'),
  multitenant = require('..');

var tenants = {
  blah: {
    company: 'Blabla Inc.',
    host: '143.89.123.8'
  }
};

var tenantId = function(req, done) {
  done(null, 'blah');
};

describe('multitenant', function() {

  describe('tenantId', function() {

    it('must exist', function() {
      assert.throws(function() {
        return execute({
          tenants: tenants
        });
      });
    });

    it('gets added to context object', function() {
      return execute({
        tenantId: tenantId,
        tenants: tenants
      }, 200)
      .then(function(tenant) {
        assert.equal(tenant.id, 'blah');
      });
    });

  });

  describe('tenants', function() {

    it('as an object', function() {
      return execute({
        tenantId: tenantId,
        tenants: tenants
      }, 200);
    });

    it('as a function', function() {
      return execute({
        tenantId: tenantId,
        tenants: function(tenantId, done) {
          done(null, tenants[tenantId]);
        }
      }, 200);
    });
  });

  describe('noTenantId', function() {

    it('as default', function() {
      return execute({
        tenantId: function(req, done) {
          done();
        }
      }, 400);
    });

    it('as a function', function() {
      return execute({
        tenantId: function(req, done) {
          done();
        },
        noTenantId: function(req, res) {
          res.status(500).send();
        }
      }, 500);
    });
  });

  describe('noTenantFound', function() {

    it('as default', function() {
      return execute({
        tenantId: tenantId,
        tenants: {}
      }, 400);
    });

    it('as a function', function() {
      return execute({
        tenantId: tenantId,
        tenants: {},
        noTenantFound: function(req, res, next) {
          res.status(500).send();
        }
      }, 500);
    });
  });

  describe('context', function() {

    it('with a function', function() {
      return execute({
        tenantId: tenantId,
        context: {
          host: function(tenant, done) {
            done(null, tenant.host);
          }
        }
      }, 200)
      .then(function(tenant) {
        assert.equal(tenant.host, tenants.blah.host);
      });
    });

    it('with a value', function() {
      return execute({
        tenantId: tenantId,
        context: {
          fixed: 'value'
        }
      }, 200)
      .then(function(tenant) {
        assert.equal(tenant.fixed, 'value');
      });
    });

    it('with a failure', function() {
      return execute({
        tenantId: tenantId,
        context: {
          host: function(tenant, done) {
            done(new Error());
          }
        }
      }, 500);
    });
  });
});

function execute(config, status) {
  config.tenants = config.tenants || tenants;

  var tenant;

  var server = express()
    .use(multitenant(config))
    .use(function(req, res, next) {
      tenant = context.get('tenant');

      next();
    })
    .get('', function(req, res) {
      res.status(200).send();
    })
    .use(function(err, req, res, next) {
      res.status(err.status || 500).send();
    });

  return supertest(server)
    .get('')
    .expect(status)
    .then(function() {
      return tenant;
    });
}
