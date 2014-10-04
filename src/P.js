// A very simple promise implementation without external dependencies.
// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
var P = {
    defer : Deferred,
    then : function(onResolve, onReject) {
        var deferred = this.defer();
        deferred.resolve();
        return deferred.then(onResolve, onReject);
    },
    reject : function(value) {
        var deferred = this.defer();
        deferred.reject(value);
        return deferred;
    },
    resolve : function(value) {
        var deferred = this.defer();
        deferred.resolve(value);
        return deferred;
    }
};
function Deferred() {
    var slots = [];
    var done;
    var that = this || {};
    that.then = function(onResolve, onReject) {
        var next = new Deferred();
        slots.push({
            onResolve : onResolve,
            onReject : onReject,
            next : next
        });
        if (done) {
            done();
        }
        return next;
    };
    that.resolve = function(result) {
        finish(function(slot) {
            if (slot.onResolve) {
                return slot.onResolve(result);
            } else {
                return result;
            }
        });
    };
    that.reject = function(err) {
        finish(function(slot) {
            if (slot.onReject) {
                return slot.onReject(err);
            } else {
                throw err;
            }
        });
    };
    return that;
    function finish(action) {
        that.resolve = that.reject = function() {
            throw new Error('This promise is already resolved.');
        };
        var scheduled = false;
        done = function() {
            if (scheduled) {
                return;
            }
            scheduled = true;
            Deferred.nextTick(function() {
                scheduled = false;
                var prevSlots = slots;
                slots = [];
                for (var i = 0; i < prevSlots.length; i++) {
                    var slot = prevSlots[i];
                    var next = slot.next;
                    try {
                        result = action(slot);
                        if (result && typeof result.then === 'function') {
                            result.then(next.resolve, next.reject);
                        } else {
                            next.resolve(result);
                        }
                    } catch (err) {
                        next.reject(err);
                    }
                }
            });
        };
        done();
    }
}
Deferred.nextTick = function(action) {
    if (typeof process !== 'undefined' && process.nextTick) {
        Deferred.nextTick = process.nextTick;
    } else {
        Deferred.nextTick = function(action) {
            setTimeout(action, 0);
        };
    }
    Deferred.nextTick(action); // It is not an infinite recursion!
};
P.all = function(list) {
    var deferred = P.defer();
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
    return deferred;
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
module.exports = P;
