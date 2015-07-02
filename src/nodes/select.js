/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('select', {
        link: function (name, scope, children, args, vars) {
            var select = document.createElement('SELECT');
            var hash = args[1] || [];
            var model = utils.eval(args[2]);
            var docFrag = document.createDocumentFragment();
            
            scope.$watch(function (scope) {
                return model.call(select, scope, utils.extend({$value: undefined}, vars, {$value: undefined}));
            }, function (val) {
                select.value = val;
            });
            
            utils.each(args[0], function (value, key) {
                var expr;
                if (typeof value === 'function') {
                    scope.$watch(function (scope) {
                        return value.call(select, scope);
                    }, function (value) {
                        select.setAttribute(key, value);
                    });
                } else if (utils.isExpr(value)) {
                    expr = utils.expr(value);

                    scope.$watch(function (scope) {
                        return expr.call(select, scope, vars);
                    }, function (value) {
                        select.setAttribute(key, value);
                    });
                } else {
                    select.setAttribute(key, value);
                }
            });
            
            utils.each(hash, function (value, key) {
                var option = document.createElement('OPTION');
                option.setAttribute("value", key);
                option.innerText = value;
                
                this.appendChild(option);
            }, docFrag);
            
            select.appendChild(docFrag);
            
            if (select.addEventListener) {
                select.addEventListener('change', function () {
                    model.call(select, scope, utils.extend({}, vars, {$value: select.value}));
                    scope.$apply();
                });
            } else if (select.attachEvent) {
                select.attachEvent('onchange', function () {
                    model.call(select, scope, utils.extend({}, vars, {$value: select.value}));
                    scope.$apply();
                });
            }
            
            return select;
        }
    });
});
