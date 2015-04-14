module.exports = function (grunt) {
    grunt.initConfig({
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: [
                    'src/main.js',
                    'src/utils.js',
                    'src/scope.js',
                    'src/annotation.js',
                    'src/view.js',
                    'src/annotations/accessor.js',
                    'src/annotations/altimage.js',
                    'src/annotations/on.js',
                    'src/annotations/setproperty.js',
                    'src/node/text.js',
                    'src/node/tag.js',
                    'src/node/each.js'
                ],
                dest: 'dist/atframework.js'
            }
        }
    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.registerTask('default', ['concat']);
};
