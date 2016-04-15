module.exports = function ( grunt ) {

    grunt.initConfig( {
        uglify: {
            options: {
                mangle   : false,
                sourceMap: true
            },
            dev    : {
                files: {
                    "fancycriteria.min.js": [ "fancycriteria.js" ]
                }
            }
        }
    } );

    grunt.loadNpmTasks( "grunt-contrib-uglify" );
};