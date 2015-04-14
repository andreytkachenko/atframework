/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */


var ATF = {
    runindex: 0,
    dependencies: {},

    invoke: function (deps, func) {
        return func.apply(null, this.resolve(deps));
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

ATF.config('jQuery', jQuery);

$(document).ready(function () {
    ATF.init();
});;/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

ATF.factory('utils', [], function () {
    return {
        isExpr: function (value) {
            return value.match(/({{.*?}})/) ? true : false;
        },

        eval: function (__js) {
            return function (__data, __vars) {
                var __result, $self = __data;
                with (__vars||{}) {
                    with (__data) {
                        try {
                            __result = eval(__js);
                        } catch (e) {
                            console.warn(e.message);
                            console.warn(e.stack);
                        }
                    }
                }
                return __result;
            };
        },

        expr: function (__value) {
            return this.eval('"' + __value.replace(/{{(.*?)}}/g, '" + ($1) + "') + '"')
        },

        each: function (arr, callback, context) {
            if (typeof arr !== "object") return;

            if (arr.length !== undefined) {
                for (var i = 0; i <  arr.length; i++) {
                    if (callback.call(context, arr[i], i, arr)) break;
                }
            } else {
                for (var i in arr) {
                    if (arr.hasOwnProperty(i)) {
                        if (callback.call(context, arr[i], i, arr)) break;
                    }
                }
            }

            return context;
        },

        lens:function (path) {
            return function __lens__(obj, _path) {
                _path = _path || path;

                var dotIndex = _path.indexOf('.');

                if (!obj) {
                    return undefined;
                }

                return dotIndex === -1 ? obj[_path] : __lens__(obj[_path.substr(0, dotIndex)], _path.substr(dotIndex + 1));
            }
        }
    }
});;/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

ATF.factory('$scope', ['$rootScope'], function ($rootScope) {
    return $rootScope.$new();
});

ATF.factory('$scopeFactory', [], function () {
    return function (parent) {
        function ChildScope () {}
        ChildScope.prototype = parent;
        var child = new ChildScope();
        if (!parent.hasOwnProperty('$$children')) {
            parent.$$children = [];
        }

        parent.$$children.push(child);
        child.$$parent = parent;

        return child;
    }
});

ATF.factory('RootScope', ['jQuery', '$scopeFactory', 'utils'],
    function ($, $scopeFactory, utils) {
        var RootScope = function () {
            this.$$listeners = {};
            this.watchList = [];
            this.$$children = [];
        };

        RootScope.prototype = {
            _trigger: function (name, broadcast, args) {
                var i;

                if (this.hasOwnProperty('$$listeners') && this.$$listeners[name]) {
                    for (i = 0; i < this.$$listeners[name].length; i++) {
                        this.$$listeners[name][i].apply(this, args);
                    }
                }

                if (broadcast) {
                    if (this.hasOwnProperty('$$children') && this.$$children.length) {
                        for (i = 0; i < this.$$children[name].length; i++) {
                            this.$$children[i]._trigger.call(this.$$children[i], name, true, args);
                        }
                    }
                } else {
                    if (this.hasOwnProperty('$$parent')) {
                        this.$$parent._trigger.call(this.$$parent, name, false, args);
                    }
                }
            },

            $on: function (name, listener) {
                if (!this.hasOwnProperty('$$listeners')) {
                    this.$$listeners = {};
                }

                this.$$listeners[name] = this.$$listeners[name] || [];
                this.$$listeners[name].push(listener);
            },

            $emit: function (name) {
                return this._trigger(name, false, Array.prototype.slice.call(arguments, 1));
            },

            $broadcast: function (name) {
                return this._trigger(name, true, Array.prototype.slice.call(arguments, 1));
            },

            $new: function () {
                return $scopeFactory(this);
            },

            $lens: function (path) {
                return utils.lens(path)(this);
            },

            $watch: function (expr, callback, deep) {
                var exprFunc;
                if (typeof expr == 'string') {
                    exprFunc = (function () {
                        return this.$lens(expr);
                    }).bind(this);
                } else {
                    exprFunc = expr;
                }

                if (!this.hasOwnProperty('watchList')) {
                    this.watchList = [];
                }

                this.watchList.push({
                    func: exprFunc,
                    callback: callback,
                    deep: deep,
                    obj: null,
                    hash: null,
                    scope: this
                });
            },

            $extend: function (obj) {
                $.extend(this, obj);
                return this;
            },

            $destroy: function () {
                var parent = this.$$parent;
                var index = parent.$$children.indexOf(this);
                if (index > -1) {
                    parent.$$children.splice(index, 1);
                }
                parent.$digest();
            },

            $digest: function () {
                if (this.hasOwnProperty('watchList')) {
                    $.each(this.watchList, (function (key, value) {
                        var obj = value.func(this);

                        if (value.obj !== obj) {
                            value.obj = obj;

                            return value.callback.call(this, obj, value.obj);
                        }

                        if (value.deep) {
                            throw new Error('unsupported')
                        }
                    }).bind(this));
                }
                if (this.hasOwnProperty('$$children')) {
                    $.each(this.$$children, (function (key,child) {
                        child.$digest();
                    }).bind(this));
                }
            },

            $apply: function () {
                var self = this;
                setTimeout(function () {
                    self.$digest();
                }, 0);
            }
        };

        return RootScope;
    });

ATF.service('$rootScope', ['RootScope'], function (RootScope) {
    return new RootScope();
});;/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

ATF.service('$directiveProvider', [], function () {
    function DirectiveProvider () {
        this.directives = [];
    }

    DirectiveProvider.prototype = {
        register: function (name, obj) {
            this.directives.push({
                name: name,
                controller: obj
            });
        },
        all: function () {
            return this.directives;
        }
    };

    return new DirectiveProvider();
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.factory('$template', ['$directiveProvider'], function ($directiveProvider) {
    var directives = $directiveProvider.all();
    function Template() {
        this.stack = [];
        this.annotations = [];

        this.root = {
            children: []
        };
        var self = this;
        directives.forEach(function (directive) {
            Template.prototype[directive.name] = function () {
                return self._directive(directive, arguments);
            };
        });
    }

    Template.prototype = {
        _directives: {},
        end: function () {
            this.stack.pop();
            this.annotations = [];

            return this;
        },

        print: function () {
            var children = function (el) {
                var a = [];

                if (el.annotations) {
                    el.annotations.forEach(function (obj) {
                        a.push('@' + obj.directive.name);
                    });
                }

                a.push(el.directive ? el.directive.name : 'root');

                if (el.children) {
                    el.children.forEach(function (obj) {
                        var ch = children(obj);
                        ch.forEach(function (val) {
                            a.push('| ' + val);
                        })
                    });
                }

                return a;
            };

            return children(this.root).join('\n');
        },


        render: function (scope) {
            var children = function (dir, scope) {
                var _scope = scope;

                if (dir.directive.controller.scope === true) {
                    _scope = scope.$new();
                }

                var _children = function (_scope, node) {
                    return dir.children.map(function (obj) {
                        var child = children(obj, _scope);
                        child._parent = node;

                        return child;
                    });
                };

                var $el = dir.directive.controller.link(dir.directive.name, _scope, _children, dir.args);

                if (dir.annotations) {
                    dir.annotations.reverse().forEach(function (obj) {
                        $el = obj.directive.controller.link(obj.name, $el, _scope, obj.args);
                    });
                }

                return $el;
            };

            var frag = document.createDocumentFragment();
            this.root.children.forEach(function (child) {
                frag.appendChild(children(child, scope));
            });

            return frag;
        },

        _directive: function (directive, args) {
            var parent = this.stack.length ? this.stack[this.stack.length - 1] : this.root,
                obj = {
                    directive: directive,
                    args: args
                };

            if (directive.name.substr(0, 1) === '$') {
                this.annotations.push(obj);
            } else {
                if (this.annotations.length) {
                    obj.annotations = this.annotations;
                    this.annotations = [];
                }
                parent.children.push(obj);
                obj.parent = parent;

                if (directive.name !== 'text') {
                    obj.children = [];
                    obj.selfClosed = false;
                    this.stack.push(obj);
                } else {
                    obj.selfClosed = true;
                }
            }

            return this;
        }
    };

    return function () {
        return new Template();
    };
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('$Accessor', {
        link: function (name, $el, scope, args) {
            if (!args[0] || !args[1]) {
                return $el;
            }

            var accessorExpr = utils.eval(args[0]);
            var valueExpr = utils.eval(args[1]);

            scope.$watch(function () {
                return accessorExpr.call($el, {});
            }, function (value) {
                valueExpr.call($el, scope, {
                    $value: value
                });
            });

            return $el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider'], function ($directiveProvider) {
    $directiveProvider.register('$AltImage', {
        link: function (name, el, scope, args) {
            var $el = $(el);
            var expr = args[0];

            var callback = function (event) {
                var img = new Image();
                img.src = expr;
                img.onload = (function () {
                    $(this).attr('src', expr);
                }).bind(this);
            };

            $el.on('error', callback);

            return el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */


ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('$On', {
        link: function (name, $el, scope, args) {
            if (!args[0] || !args[1]) {
                return $el;
            }

            var eventName = args[0];
            var expr = utils.eval(args[1]);
            var apply = args[2];

            if (eventName.toLowerCase() === 'transitionend') {
                eventName = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
            }

            $($el).on(eventName, function ($event) {
                if (args[2] || eventName === 'click') {
                    $event.preventDefault();
                }

                expr.call(this, scope, {
                    $event: $event
                });

                if (apply) {
                    scope.$apply();
                }
            });

            return $el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('$SetProperty', {
        link: function (name, $el, scope, args) {
            if (!args[0] || !args[1]) {
                return $el;
            }
            var expr = utils.eval(args[1]);

            scope.$watch(function (scope) {
                return expr(scope);
            }, function (value) {
                var val = $el[args[0]];
                if (val !== value) {
                    $el[args[0]] = value;
                }
            });

            return $el;
        }
    });
});