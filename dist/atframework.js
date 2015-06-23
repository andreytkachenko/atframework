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

            if (item.resolving)
                throw Error('Recursive dependency');

            visited[name] = true;

            if (item.resolved) {
                return true;
            }

            item.resolving = true;

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
};;/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

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


        render: function (scope, vars) {
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

                var $el = dir.directive.controller.link(dir.directive.name, _scope, _children, dir.args, vars);

                if (dir.annotations) {
                    dir.annotations.reverse().forEach(function (obj) {
                        $el = obj.directive.controller.link(obj.name, $el, _scope, obj.args, vars);
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
        link: function (name, $el, scope, args, vars) {
            var __vars = vars || {};
            if (!args[0] || !args[1]) {
                return $el;
            }

            var accessorExpr = utils.eval(args[0]);
            var valueExpr = utils.eval(args[1]);

            scope.$watch(function () {
                return accessorExpr.call($el, scope, __vars);
            }, function (value) {
                __vars.$value = value;
                valueExpr.call($el, scope, __vars);
            });

            return $el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('$Watch', {
        link: function (name, $el, scope, args, vars) {
            var __vars = vars || {};
            if (!args[0] || !args[1]) {
                return $el;
            }

            var watchingExpr = utils.eval(args[0]);
            var onChangeExpr = utils.eval(args[1]);

            scope.$watch(function () {
                return watchingExpr.call($el, scope, __vars);
            }, function (value) {
                __vars.$value = value;
                onChangeExpr.call($el, scope, __vars);
                if (args[2]) {
                    scope.$apply();
                }
            });

            return $el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'jQuery'], function ($directiveProvider, $) {
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


ATF.invoke(['$directiveProvider', 'utils', 'jQuery'], function ($directiveProvider, utils, $) {
    $directiveProvider.register('$On', {
        link: function (name, $el, scope, args, vars) {
            var __vars = vars||{};
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
                __vars.$event = $event;

                if (args[2] || eventName === 'click') {
                    $event.preventDefault();
                }

                expr.call(this, scope, __vars);

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
        link: function (name, $el, scope, args, vars) {
            var __vars = vars || {};
            if (!args[0] || !args[1]) {
                return $el;
            }
            var expr = utils.eval(args[1]);

            scope.$watch(function (scope) {
                return expr(scope, __vars);
            }, function (value) {
                var val = $el[args[0]];
                if (val !== value) {
                    $el[args[0]] = value;
                }
            });

            return $el;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('text', {
        link: function (name, scope, children, args, vars) {
            var expr = args[0];
            var node = document.createTextNode('');

            if (utils.isExpr(expr)) {
                scope.$watch(function (scope) {
                    return utils.expr(expr).call(node, scope, vars);
                }, function (val) {
                    node.nodeValue = val;
                })
            } else {
                node.nodeValue = expr;
            }

            return node;
        }
    });
});;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    var tagController = {
        link: function (name, scope, children, args, vars) {
            var elem = document.createElement(name);

            utils.each(args[0], function (value, key) {
                var expr;
                if (typeof value === 'function') {
                    scope.$watch(function (scope) {
                        return value.call(elem, scope);
                    }, function (value) {
                        elem.setAttribute(key, value);
                    });
                } else if (utils.isExpr(value)) {
                    expr = utils.expr(value);

                    scope.$watch(function (scope) {
                        return expr.call(elem, scope, vars);
                    }, function (value) {
                        elem.setAttribute(key, value);
                    });
                } else {
                    elem.setAttribute(key, value);
                }
            });

            children(scope, elem).forEach(function (child) {
                elem.appendChild(child);
            });

            return elem;
        }
    };

    ['div', 'em', 'span', 'a', 'img', 'video', 'ul', 'li', 'p', 'iframe'].forEach(function (tag) {
        $directiveProvider.register(tag, tagController);
    });
});
;/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('each', {
        scope: true,
        link: function (name, scope, children, args, vars) {
            if (args.length < 2 || args.length > 3) {
                throw Error('Repeat: Invalid number of arguments!');
            }

            var localVarName = args[0];
            var sourceVarExpr = utils.eval(args[1]);
            var indexVarName = args[2];
            var element = document.createDocumentFragment();

            scope.$watch(function (scope) {
                return sourceVarExpr(scope, vars).length;
            }, function () {
                var frag = document.createDocumentFragment();

                utils.each(sourceVarExpr(scope, vars), function (value, key) {
                    var subScope = scope.$new();
                    subScope[localVarName] = value;
                    if (indexVarName) {
                        subScope[indexVarName] = key;
                    }
                    var $els = children(subScope);
                    utils.each($els, function ($el) {
                        $el._scope = subScope;
                        frag.appendChild($el);
                    });
                });

                utils.each(element._parent.children, function (el) {
                    if (el._scope) el._scope.$destroy();
                    element._parent.removeChild(el);
                });

                element._parent.appendChild(frag);
            });

            return element;
        }
    });
});