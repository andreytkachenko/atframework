/*! AtFramework | Andrey Tkachenko | MIT License | github.com/andreytkachenko/atframework */

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
});