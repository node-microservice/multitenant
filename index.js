var async = require('async'),
  context = require('request-context'),
  HttpError = require('http-errors');

module.exports = function(options) {
  options = options || {};

  assertProperty(options, 'tenantId', ['function']);
  assertProperty(options, 'tenants', ['object', 'function']);

  options.tenants = wrap(options.tenants);
  options.context = options.context || {};
  options.noTenantId = options.noTenantId || _noTenantId;
  options.noTenantFound = options.noTenantFound || _noTenantFound;

  if (options.context && typeof options.context === 'object') {
    Object.keys(options.context).forEach(function(key) {
      assertProperty(options.context, key);

      var val = options.context[key];

      options.context[key] = async.ensureAsync(typeof val === 'function' ?
        val : function(tenant, done) {
          done(null, val);
        });
    });
  }

  return [context.middleware('tenant'), function(req, res, next) {
    async.waterfall([
      function(callback) {
        options.tenantId(req, function(err, tenantId) {
          if (err) {
            callback(err);
            return;
          }

          if (tenantId) {
            callback(null, tenantId);
          } else {
            options.noTenantId(req, res, next);
          }
        });
      },
      function(tenantId, callback) {
        options.tenants(tenantId, function(err, tenant) {
          if (err) {
            callback(err);
            return;
          }

          if (tenant) {
            tenant.id = tenantId;
            callback(null, tenant);
          } else {
            options.noTenantFound(req, res, next);
          }
        });
      },
      function(tenant, done) {
        var tenantContext = {
          id: tenant.id
        };

        async.forEachOf(options.context, function(ctx, key, callback) {
          ctx(tenant, function(err, val) {
            if (err) {
              callback(err);
              return;
            }
            tenantContext[key] = val;
            callback();
          });
        }, function(err) {
          if (err) {
            done(err);
            return;
          }

          context.set('tenant', tenantContext);
          done();
        });
      }
    ], next);
  }];
};

function wrap(tenants) {
  return function(tenantId, callback) {
    if (typeof tenants === 'function') {
      tenants(tenantId, callback);
    } else {
      callback(null, tenants[tenantId]);
    }
  };
}

function _noTenantId(req, res, next) {
  next(new HttpError(400, 'no tenant id found'));
}

function _noTenantFound(req, res, next) {
  next(new HttpError(400, 'tenant not found'));
}

function assertProperty(options, property, desiredTypes) {
  var value = options[property];

  if (value) {
    var type = typeof value;

    if (desiredTypes && desiredTypes.length) {
      var valid = desiredTypes.some(function(desiredType) {
        return desiredType === type;
      });

      if (valid) {
        return;
      }

      throw new Error("Propety '" + property + "' has to be of types [" + desiredTypes.join(',') + "]");
    } else {
      return;
    }
  }

  throw new Error("Property '" + property + "' has to be specified");
}
