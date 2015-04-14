/**
 * Created by tkachenko on 14.04.15.
 */


ATF.factory('$hash', [], function () {
    return {
        map: {},
        objMap: {},
        objKeys: {},
        index: 0,
        gen: function (prefix) {
            return prefix + (this.index++);
        },
        hash: function (obj, recursive) {
            var _h;
            switch (typeof obj) {
                case 'string':
                    this.map[obj] = this.map[obj] || this.gen('s');
                    return this.map[obj];
                case 'number':
                    this.map[obj] = this.map[obj] || this.gen('n');
                    return this.map[obj];
                case 'function':
                    obj.$$hash = obj.$$hash || this.gen('f');
                    return obj.$$hash;

                case 'object':
                    if (recursive) {
                        _h = '';
                        for (var key in obj) {
                            if (obj.hasOwnProperty(key) && key.substr(0, 2) !== '$$') {
                                this.objKeys[key] = this.objKeys[key] || this.gen('k');
                                _h += '|' + this.objKeys[key] + ':' + this.hash(obj[key], true);
                            }
                        }

                        this.objMap[_h] = this.objMap[_h] || this.gen('o');

                        obj.$$hash = obj.$$hash === this.objMap[_h] ? obj.$$hash: this.objMap[_h];
                    } else {
                        obj.$$hash = obj.$$hash || this.gen('o');
                    }

                    return obj.$$hash;
            }
        }
    };
});