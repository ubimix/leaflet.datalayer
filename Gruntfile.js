var webpack = require('webpack');
var Path = require('path');

module.exports = function(grunt) {
    var sourceFiles = [ 'src/**/*.js', 'test/**/*.js' ];
    var distDir = './dist';

    var pkg = grunt.file.readJSON('package.json');
    var banner = getBanner(pkg);
    var config = {
        pkg : pkg
    };

    // ----------------------------------------------------------------------
    // WebPack
    config.webpack = {
        main : {
            entry : './index.js',
            output : {
                path : distDir,
                filename : pkg.appname + '.js',
                library : pkg.appname,
                libraryTarget : 'umd'
            },
            externals : [ {
                'leaflet' : 'leaflet'
            } ],
            resolve : {
                modulesDirectories : [ "node_modules" ],
            },
            plugins : [ new webpack.BannerPlugin(banner) ]
        }
    };
    grunt.loadNpmTasks('grunt-webpack');

    // ----------------------------------------------------------------------
    config.watch = {
        scripts : {
            files : [ '*.js' ].concat(sourceFiles),
            tasks : [ 'webpack' ],
            options : {
                spawn : false,
                interrupt : true,
            },
        },
    };
    grunt.loadNpmTasks('grunt-contrib-watch');

    // ----------------------------------------------------------------------
    // Version bump
    grunt.loadNpmTasks('grunt-bump');
    config.bump = {
        options : {
            files : [ 'package.json', 'bower.json' ],
            updateConfigs : [],
            commit : true,
            commitMessage : 'Release v%VERSION%',
            commitFiles : [ '.' ],
            createTag : true,
            tagName : 'v%VERSION%',
            tagMessage : 'Version %VERSION%',
            push : false,
            pushTo : 'upstream',
            gitDescribeOptions : '--tags --always --abbrev=1 --dirty=-d'
        }
    };
    grunt.registerTask('inc', [ 'bump-only' ]);
    grunt.registerTask('incMinor', [ 'bump-only:minor' ]);
    grunt.registerTask('incMajor', [ 'bump-only:major' ]);

    // ----------------------------------------------------------------------
    // jshint
    config.jshint = {
        files : sourceFiles,
        options : {
            globals : {
                console : true,
                module : true,
                require : true
            }
        }
    };
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // ----------------------------------------------------------------------
    // Testing
    config.mochaTest = {
        test : {
            options : {
                reporter : 'spec'
            },
            src : [ 'test/**/spec_*.js', 'test/**/*_spec.js' ]
        }
    };
    grunt.loadNpmTasks('grunt-mocha-test');

    // ----------------------------------------------------------------------
    // Uglify
    config.uglify = {
        options : {
            banner : '/* \n * ' + banner + ' */\n'
        },
        browser : {
            src : 'dist/<%= pkg.appname %>.js',
            dest : 'dist/<%= pkg.appname %>.min.js'
        }
    };
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // ----------------------------------------------------------------------

    grunt.initConfig(config);
    grunt.registerTask('test', [ 'jshint', 'mochaTest' ]);
    grunt.registerTask('build', [ 'test', 'webpack' ]);
    grunt.registerTask('build-min', [ 'build', 'uglify' ]);
    grunt.registerTask('commit', [ 'build-min', 'bump-commit' ]);
    grunt.registerTask('default', [ 'build-min' ]);
}

function getBanner(pkg) {
    // Project configuration.
    var licenses = '';
    (pkg.licenses || []).forEach(function(l) {
        if (licenses.length) {
            licenses += ', ';
        }
        licenses += l ? l.type || '' : '';
    });
    if (licenses.length) {
        licenses = ' | License: ' + licenses + ' ';
    }
    return '<%= pkg.appname %> v<%= pkg.version %>' + licenses + '\n';
}