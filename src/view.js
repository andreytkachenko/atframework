/**
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
});