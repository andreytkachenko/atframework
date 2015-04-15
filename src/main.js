/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

var ATF = {
    initialized: false,
    runindex: 0,
    dependencies: {},
    invoking: [],

    invoke: function (deps, func) {
        if (this.initialized) {
            func.apply(null, this.resolve(deps));
        } else {
            this.invoking.push(arguments);
        }
    },

    resolve: function (deps) {
        var dependencies = this.dependencies;
        return deps.map(function (i) {
            return dependencies[i].func();
        });
    },

    register: function (name, deps, func, type) {
        if (this.dependencies[name]) {
            throw Error(name + ' is already registered!');
        }

        this.dependencies[name] = {
            func: func(),
            name: name,
            deps: deps,
            type: type,
            resolving: false,
            resolved: false
        };
    },

    controller: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
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
        }, 'controller');
    },
    factory: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
            return function () {
                return func.apply(null, self.resolve(deps));
            }
        }, 'factory');
    },
    service: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
            var instance;
            return function () {
                if (!instance) {
                    var resolved = self.resolve(deps);
                    instance = func.apply(null, resolved);
                }

                return instance
            }
        }, 'service');
    },
    view: function (name, deps, func) {
        var self = this;
        this.register(name, deps, function () {
            return function () {
                return func.apply(null, self.resolve(deps));
            }
        }, 'view');

        return this;
    },
    config: function (name, value) {
        this.register(name, null, function () {
            return function () {
                return value;
            }
        }, 'config');

        return this;
    },
    run: function (deps, func) {
        var self = this;
        this.register('run' + this.runindex, deps, function () {
            return function () {
                return func.apply(null, self.resolve(deps));
            }
        }, 'run');
    },

    init: function () {
        var runnable = [];
        var dependencies = this.dependencies;

        var resolve = function (name) {
            var item;

            if (!dependencies[name]) {
                throw Error('Unknown dependency '+name);
            }

            item = dependencies[name];

            if (item.resolving)
                throw Error('Recursive dependency');

            if (item.resolved) {
                return;
            }

            item.resolving = true;

            if (item.deps) {
                for (var i = 0; i < item.deps.length; i++) {
                    resolve(item.deps[i]);
                }
            }

            item.resolving = false;
            item.resolved = true;
        };

        this.initialized = true;

        if (this.invoking.length) {
            for (var i=0; i < this.invoking.length; i++) {
                this.invoke.apply(this, this.invoking[i]);
            }
        }

        for (var i in this.dependencies) {
            if (this.dependencies.hasOwnProperty(i)) {
                if (this.dependencies[i].resolved) continue;
                if (this.dependencies[i].resolving) throw Error('Recursive dependency');
                resolve(i);

                if (this.dependencies[i].type === 'run') {
                    runnable.push(this.dependencies[i].func);
                }
            }
        }

        for (var i=0; i<runnable.length; i++) {
            runnable[i]();
        }
    }
};

ATF.factory('$hash', [], function () {
    return {
        map: {},
        objMap: {},
        objKeys: {},
        index: 0,
        gen: function (prefix) {
            return prefix + (this.index++);
        },
        hash: function (obj, recursive) {
            var _h;
            switch (typeof obj) {
                case 'string':
                    this.map[obj] = this.map[obj] || this.gen('s');
                    return this.map[obj];
                case 'number':
                    this.map[obj] = this.map[obj] || this.gen('n');
                    return this.map[obj];
                case 'function':
                    obj.$$hash = obj.$$hash || this.gen('f');
                    return obj.$$hash;

                case 'object':
                    if (recursive) {
                        _h = '';
                        for (var key in obj) {
                            if (obj.hasOwnProperty(key) && key.substr(0, 2) !== '$$') {
                                this.objKeys[key] = this.objKeys[key] || this.gen('k');
                                _h += '|' + this.objKeys[key] + ':' + this.hash(obj[key], true);
                            }
                        }

                        this.objMap[_h] = this.objMap[_h] || this.gen('o');

                        obj.$$hash = obj.$$hash === this.objMap[_h] ? obj.$$hash: this.objMap[_h];
                    } else {
                        obj.$$hash = obj.$$hash || this.gen('o');
                    }

                    return obj.$$hash;
            }
        }
    };
});