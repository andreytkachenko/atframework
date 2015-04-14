/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    var tagController = {
        link: function (name, scope, children, args) {
            var elem = document.createElement(name);

            utils.each(args[0], function (value, key) {
                var expr;
                if (utils.isExpr(value)) {
                    expr = utils.expr(value);

                    scope.$watch(function (scope) {
                        return expr(scope);
                    }, function (value) {
                        elem.setAttribute(key, value);
                    });
                } else if (typeof value === 'function') {
                    scope.$watch(function (scope) {
                        return value(scope);
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

    ['div', 'em', 'span', 'a', 'img', 'video', 'ul', 'li', 'p'].forEach(function (tag) {
        $directiveProvider.register(tag, tagController);
    });
});