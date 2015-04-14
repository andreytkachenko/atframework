/**
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
});