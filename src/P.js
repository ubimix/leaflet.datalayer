// A promise wrapper providing a switchable interface for promise implementations.
// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
module.exports = P;
function P(value) {
    return P.resolve(value);
}
P.defer = function() {
    var pinkyswear = require('pinkyswear');
    P.defer = function() {
        var p = pinkyswear();
        return {
            promise : p,
            resolve : function(value) {
                p(true, [ value ]);
            },
            reject : function(reason) {
                p(false, [ reason ]);
            }
        };
    };
    return P.defer();
};
P.then = function(onResolve, onReject) {
    var deferred = P.defer();
    deferred.resolve();
    return deferred.promise.then(onResolve, onReject);
};
P.reject = function(value) {
    var deferred = P.defer();
    deferred.reject(value);
    return deferred.promise;
};
P.resolve = function(value) {
    var deferred = P.defer();
    deferred.resolve(value);
    return deferred.promise;
};
P.isPromise = function(result) {
    return result && typeof result.then === 'function';
};
P._isArray = function(obj) {
    P._isArray = (Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    });
    return P._isArray(obj);
};
P.all = function(list) {
    var deferred = P.defer();
    list = P._isArray(list) ? list : arguments;
    var len = list ? list.length : 0;
    var results = [];
    function end(error, result) {
        results.push(result);
        if (error) {
            deferred.reject(error);
        } else {
            if (results.length === len) {
                deferred.resolve(results);
            }
        }
    }
    function onResolve(result) {
        end(null, result);
    }
    function onReject(err) {
        end(err, null);
    }
    for (var i = 0; i < len; i++) {
        list[i].then(onResolve, onReject);
    }
    if (len === 0) {
        deferred.resolve(results);
    }
    return deferred.promise;
};
P.nresolver = function(deferred) {
    return function(error, value) {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve(value);
        }
    };
};
P.ninvoke = function(object, name /* ...args */) {
    var args = [];
    for (var i = 2; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    var deferred = P.defer();
    args.push(P.nresolver(deferred));
    try {
        var f = (typeof name) == 'function' ? name : object[name];
        f.apply(object, args);
    } catch (e) {
        deferred.reject(e);
    }
    return deferred.promise;
};
