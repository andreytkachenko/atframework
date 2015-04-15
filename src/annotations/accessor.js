/**
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
});