/**
 * Created by tkachenko on 14.04.15.
 */


ATF.invoke(['$directiveProvider', 'utils'], function ($directiveProvider, utils) {
    $directiveProvider.register('$On', {
        link: function (name, $el, scope, args) {
            if (!args[0] || !args[1]) {
                return $el;
            }

            var eventName = args[0];
            var expr = utils.eval(args[1]);
            var apply = args[2];

            if (eventName.toLowerCase() === 'transitionend') {
                eventName = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
            }

            $($el).on(eventName, function ($event) {
                if (args[2] || eventName === 'click') {
                    $event.preventDefault();
                }

                expr.call(this, scope, {
                    $event: $event
                });

                if (apply) {
                    scope.$apply();
                }
            });

            return $el;
        }
    });
});