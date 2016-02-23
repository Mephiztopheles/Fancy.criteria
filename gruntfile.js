module.exports = function ( grunt ) {

    grunt.initConfig( {
        uglify: {
            options: {
                mangle   : true,
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