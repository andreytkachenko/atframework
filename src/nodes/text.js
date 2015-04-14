/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('text', {
        link: function (name, scope, children, args) {
            var expr = args[0];
            var node = document.createTextNode('');

            if (utils.isExpr(expr)) {
                scope.$watch(function (scope) {
                    return utils.expr(expr)(scope);
                }, function (val) {
                    node.nodeValue = val;
                })
            } else {
                node.nodeValue = expr;
            }

            return node;
        }
    });
});