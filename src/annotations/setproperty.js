/**
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