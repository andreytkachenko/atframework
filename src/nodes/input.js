/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('textbox', {
        link: function (name, scope, children, args, vars) {
            var elem = document.createElement('INPUT');
            elem.setAttribute('type', 'text');
            
            var model = utils.eval(args[1]);
            
            scope.$watch(function (scope) {
                return model.call(elem, scope, utils.extend({$value: undefined}, vars, {$value: undefined}));
            }, function (val) {
                elem.value = val;
            });
            
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
            
            var listener = function () {
                model.call(elem, scope, utils.extend({}, vars, {$value: elem.value}));
                scope.$apply();
            };
            
            if (elem.addEventListener) {
                elem.addEventListener('change', listener);
                elem.addEventListener('keyup', listener);
            } else if (elem.attachEvent) {
                elem.attachEvent('onkeyup', listener);
                elem.attachEvent('onchange', listener);
            }
            
            return elem;
        }
    });
});
