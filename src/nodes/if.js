/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('if', {
        scope: false,
        link: function (name, scope, children, args) {
            if(args.length !== 1) {
                throw Error('Repeat: Invalid number of arguments!');
            }

            var conditionExpr = utils.eval(args[0]);
            var element = document.createDocumentFragment();
            var _children = null;

            scope.$watch(function (scope) {
                return conditionExpr(scope);
            }, function (value) {
                if (value) {
                    _children = children(scope);
                    utils.each(_children, function (el) {
                        element._parent.appendChild(el);
                    });
                    scope.$apply();
                } else if(_children) {
                    utils.each(_children, function (el) {
                        element._parent.removeChild(el);
                        delete el;
                    });
                }
            });

            return element;
        }
    });
});