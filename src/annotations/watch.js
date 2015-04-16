/**
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
});