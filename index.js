var async = require('async');

module.exports = function(options) {
  var opts = options || {};

  opts.parseTenantId = opts.parseTenantId || _parseTenantId;

  if (typeof opts.parseTenantId !== 'function') {
    wrongTypeError('parseTenantId', ['function']);
  }

  opts.tenants || missingPropertyError('tenants');
  opts.fetchTenant = _fetchTenantWrapper(opts.tenants);

  opts.onNotFound = opts.onNotFound || _onNotFound;
  opts.onNoTenantKey = opts.onNoTenantKey || _onNoTenantKey;

  opts.connectionStrategy = opts.connectionStrategy || _connectionStrategy;

  return function(req, res, next) {
    opts.parseTenantId(req, function(tenantId) {

      if (arguments.length === 0) {
        return opts.onNoTenantKey(req, res);
      }

      opts.fetchTenant(tenantId, function(tenantInformation) {

        if (typeof tenantInformation === 'undefined') {
          return opts.onNotFound(req, res);
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
}

/*
 * parse request to retrieve tenant key
 * defaults to subdomain
 */
function _parseTenantId(req, done) {
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
function _onNotFound(req, res) {
  res.send(404);
}

/*
 * there is no key for tennant
 */
function _onNoTenantKey(req, res) {
  res.send(404);
}

function missingPropertyError(property) {
  throw new Error("A '" + property + "' property has to be specified");
}

function wrongTypeError(property, desiredType) {
  throw new Error("Propety '" + property + "' has to be of types [" + desiredType.join(',') + "]");
}
