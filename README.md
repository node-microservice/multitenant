express-multitenant
===================

express middleware for multitenant achitecture

### Usage:
```javascript
var express = require('express');
var multitenant = require('multitenant');
var app = express();

app.use(multitenant({...})); // pass in an options object
```

### Options

##### tenants (mandatory)
It can be an object or a function, and in both case should provide the information relative to a given tenant.

The object's keys has to be the same as the tenant's ID.
```javascript
tenants: {
  foo: {...}, // tenant of ID 'foo'
  bar: {...}  // tenant of ID 'bar'
}
```
The function is has a tenant ID and a callback as arguments.
```javascript
tenants: function(tenantId, done) {
  var tenantInformation = getTenantInformation(tenantId); // some code to load the tenant information
  done(tenantInfomation);
}
```

##### parseTenantId (optional)

Function which parses the request object and provides a callback with the tenantId. It defaults to the subdomain.
```javascript
parseTenantId: function(request, done) {
  var tenantID = extractTenantIdFromRequest(request); // some code to extract the tenantId from the request
  done(tenantId);
}
```

##### onNotFound (optional)

Called when the tenant cannot be found with the given tenantId. It is the last function of the middleware chain, it is passed a request and response as arguments. By default it sends a 404 error

```javascript
onNotFound: function(request, response) {
  response.send('some error message');
}
```

##### onNoTenantKey (optional)

Called when the tenantId cannot be determined. It is the last function of the middleware chain, it is passed a request and response as arguments. By default it sends a 404 error

```javascript
onNoTenantKey: function(request, response) {
  response.send('some error message');
}
```

##### connectionStrategy (optional)

This is where you initialize a connection to a database. It takes two arguments: the tenant information object, and a callback. Arguments provided to the callback will be assigned to `request.tenantConnection`.
```javascript
connectionStrategy: function(tenantInformation, done) {
  var connection = initializeDatabaseConnection(tenantInformation);
  done(connection);
}
```

Alternatively, it can be an object whose values are either functions or values, which are assigned to the `req` object using their respective key.

```javascript
connectionStrategy: {
  foo: 'bar', // sets req.foo to 'bar'
  baz: function(tenant, callback) {
    callback(null, 'baz'); // sets req.baz to 'baz' - first argument is an error which will propagate to next(err)
  }
}
```
