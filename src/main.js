/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

var ATF = {
    initialized: false,
    dependencies: {},
    pending: [],

    _depsResolved: function (deps) {
        for(var i = 0; i < deps.length; i++) {
            if (!this.dependencies[deps[i]] ||
                this.dependencies[deps[i]].resolved === false) {

                return false;
            }
        }

        return true;
    },

    invoke: function (deps, func, afterInitialize) {
        var _resolved = this._depsResolved(deps);
        if ((_resolved && !afterInitialize) || (_resolved && afterInitialize && this.initialized)) {
            func.apply(null, this.resolve(deps));
        } else {
            this.pending.push(arguments);
        }
    },

    resolve: function (deps) {
        var dependencies = this.dependencies;
        return deps ? deps.map(function (i) {
            return dependencies[i].func();
        }) : [];
    },

    invokePending: function () {
        var len = this.pending.length;
        while (len--)
            this.invoke.apply(this, this.pending.shift());
    },

    resolveDependencies: function () {
        var dependencies = this.dependencies;
        var visited = {};

        var resolve = function (name, visited) {
            var item, failed = false;

            if (!dependencies[name]) {
                return false;
            }

            item = dependencies[name];

            if (visited[name])
                throw Error('Recursive dependency');

            visited[name] = true;

            if (item.resolved) {
                return true;
            }

            if (item.deps) {
                for (var i = 0; i < item.deps.length; i++) {
                    if (resolve(item.deps[i], visited) === false) {
                        failed = true;
                    }
                }

                if (failed) {
                    item.resolving = false;
                    return false;
                }
            }

            item.resolving = false;
            item.resolved = true;
        };

        for (var i in this.dependencies) {
            if (this.dependencies.hasOwnProperty(i)) {
                if (this.dependencies[i].resolved || visited[i]) continue;

                resolve(i, visited);
            }
        }

        if (this.pending.length) {
            this.invokePending();
        }
    },

    register: function (name, deps, func, type) {
        deps = deps || [];

        this.dependencies[name] = {
            func: func,
            name: name,
            deps: deps,
            type: type,
            resolving: false,
            resolved: !deps.length
        };

        this.resolveDependencies();
    },

    controller: function (name, deps, func) {
        var self = this;
        this.register(name, deps, (function () {
            var called;

            return function () {
                if (!called) {
                    var resolved = self.resolve(deps);
                    func.apply(null, resolved);
                    called = true;
                }

                return {
                    scope: resolved[deps.indexOf('$scope')]
                }
            }
        })(), 'controller');
    },
    factory: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
            return func.apply(null, self.resolve(deps));
        }, 'factory');
    },
    service: function (name, deps, func) {
        var self = this;
        this.register(name, deps, (function () {
            var instance;
            return function () {
                if (!instance) {
                    var resolved = self.resolve(deps);
                    instance = func.apply(null, resolved);
                }

                return instance
            }
        })(), 'service');
    },
    view: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
            return func.apply(null, self.resolve(deps));
        }, 'view');

        return this;
    },
    config: function (name, value) {
        this.register(name, null, function () {
            return value;
        }, 'config');

        return this;
    },
    value: function (name, value) {
        this.register(name, null, function () {
            return value;
        }, 'value');

        return this;
    },

    run: function (deps, func) {
        this.invoke(deps, func, true);
    },

    init: function () {
        this.initialized = true;

        if (this.pending.length) {
            this.invokePending();
        }
    },
    reset: function () {
        this.dependencies = {};
        this.pending = [];
        this.initialized = false;
    }
};