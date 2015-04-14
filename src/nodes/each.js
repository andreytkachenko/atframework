/**
 * Created by tkachenko on 14.04.15.
 */

ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('each', {
        scope: true,
        link: function (name, scope, children, args) {
            if (args.length < 2 || args.length > 3) {
                throw Error('Repeat: Invalid number of arguments!');
            }

            var localVarName = args[0];
            var sourceVarExpr = utils.eval(args[1]);
            var indexVarName = args[2];
            var element = document.createDocumentFragment();

            scope.$watch(function (scope) {
                return sourceVarExpr(scope).length;
            }, function () {
                var frag = document.createDocumentFragment();

                utils.each(sourceVarExpr(scope), function (value, key) {
                    var subScope = scope.$new();
                    subScope[localVarName] = value;
                    if (indexVarName) {
                        subScope[indexVarName] = key;
                    }
                    var $els = children(subScope);
                    utils.each($els, function ($el) {
                        $el._scope = subScope;
                        frag.appendChild($el);
                    });
                });

                utils.each(element._parent.children, function (el) {
                    if (el._scope) el._scope.$destroy();
                    element._parent.removeChild(el);
                });

                element._parent.appendChild(frag);
            });

            return element;
        }
    });
});