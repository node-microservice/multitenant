var async = require('async'),
  HttpError = require('http-errors');

module.exports = function(options) {
  var opts = options || {};

  opts.tenantId = opts.tenantId || opts.parseTenantId || _tenantId;

  if (typeof opts.tenantId !== 'function') {
    wrongTypeError('tenantId', ['function']);
  }

  if (opts.tenants === undefined || opts.tenants === null) {
    missingPropertyError('tenants');
  }

  opts.fetchTenant = _fetchTenantWrapper(opts.tenants);

  opts.onNotFound = opts.onNotFound || _onNotFound;
  opts.onNoTenantKey = opts.onNoTenantKey || _onNoTenantKey;

  opts.connectionStrategy = opts.connectionStrategy || _connectionStrategy;

  return function(req, res, next) {
    opts.tenantId(req, function(tenantId) {

      if (arguments.length === 0) {
        return opts.onNoTenantKey(req, res, next);
      }

      opts.fetchTenant(tenantId, function(tenantInformation) {

        if (typeof tenantInformation === 'undefined') {
          return opts.onNotFound(req, res, next);
        }

        if (typeof opts.connectionStrategy === 'function') {
          opts.connectionStrategy(tenantInformation, function(connection){
            req.tenantConnection = connection;
            next();
          });
        } else if (typeof opts.connectionStrategy === 'object' && opts.connectionStrategy !== null) {
          async.forEachOf(opts.connectionStrategy, function(value, key, callback) {
            if (typeof value === 'function') {
              value(tenantInformation, function(err, val) {
                if (err) {
                  callback(err);
                  return;
                }

                req[key] = val;
                callback();
              });
            } else {
              req[key] = value;
              callback();
            }
          }, next);
        } else {
          wrongTypeError('connectionStrategy', ['function', 'object']);
        }
      });
    });
  };
};

/*
 * parse request to retrieve tenant key
 * defaults to subdomain
 */
function _tenantId(req, done) {
  if (req.subdomains.length === 0) {
    return done();
  }
  done(req.subdomains[req.subdomains.length - 1]);
}

/*
 * get the information associated to a tenant key
 * uses a list of tenants or a function to fetch them
 */
function _fetchTenantWrapper(tenants) {
  if (typeof tenants !== 'object' && typeof tenants !== 'function') {
    wrongTypeError('tenants', ['object', 'function']);
  }

  return function(tenantId, done) {

    if (typeof tenants === 'function') {
      tenants(tenantId, done);
    } else {
      done(tenants[tenantId]);
    }
  };
}

/*
 * creates a database connection
 * pass the connection to the callback, and retrieves it in
 * 'res.tenantConnection'
 */
function _connectionStrategy(options, done) {
  done(options);
}

/*
 * tenant cannot be found
 */
function _onNotFound(req, res, next) {
  next(new HttpError(400, 'tenant not found'));
}

/*
 * there is no key for tennant
 */
function _onNoTenantKey(req, res, next) {
  next(new HttpError(400, 'no tenant key found'));
}

function missingPropertyError(property) {
  throw new Error("A '" + property + "' property has to be specified");
}

function wrongTypeError(property, desiredType) {
  throw new Error("Propety '" + property + "' has to be of types [" + desiredType.join(',') + "]");
}
