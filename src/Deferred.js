// A very simple (< 100 LOC) promise A implementation without external dependencies.
// MIT license. (c) Ubimix (c) Mikhail Kotelnikov
module.exports = Deferred;
Deferred.SYNC = false;
function Deferred() {
    var slots = [];
    var done;
    var doResolve = function(result) {
        finish(function(slot) {
            if (isFunction(slot.onResolve)) {
                return slot.onResolve.call(undefined, result);
            } else {
                return result;
            }
        });
    };
    var doReject = function(err) {
        finish(function(slot) {
            if (isFunction(slot.onReject)) {
                return slot.onReject.call(undefined, err);
            } else {
                throw err;
            }
        });
    };
    return {
        promise : {
            then : function(onResolve, onReject) {
                var next = Deferred();
                slots.push({
                    onResolve : onResolve,
                    onReject : onReject,
                    next : next
                });
                if (done) {
                    done();
                }
                return next.promise;
            }
        },
        resolve : function(result) {
            doResolve(result);
        },
        reject : function(err) {
            doReject(err);
        }
    };
    function finish(action) {
        doResolve = doReject = function() {
            // throw new Error('This promise is already resolved.');
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
                        if (result === next) {
                            throw new TypeError('Can not resolve promise ' + //
                            'with itself');
                        }
                        var then = result ? result.then : null;
                        if (isFunction(then)) {
                            then.call(result, next.resolve, next.reject);
                        } else {
                            next.resolve.call(null, result);
                        }
                    } catch (err) {
                        next.reject.call(null, err);
                    }
                }
            });
        };
        done();
    }
    function isFunction(obj) {
        return typeof obj === 'function';
    }
}
Deferred.runSync = function() {
    return Deferred.SYNC;
};
Deferred.nextTick = function(action) {
    if (Deferred.runSync()) {
        action();
    } else {
        setTimeout(action, 0);
    }
};
