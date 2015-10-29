var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync');
var concat = require('gulp-concat');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var path = require('path');
var gutil = require( 'gulp-util' );
var ftp = require( 'vinyl-ftp' );
var uglify = require('gulp-uglify');
var svgmin = require('gulp-svgmin');
var inject = require('gulp-inject');
var svgstore = require('gulp-svgstore');
var notify = require('gulp-notify');

var gulpftp = require('./gulpconfig.js');


gulp.task('svgstore', function () {
    var svgs = gulp
        .src('images/svg/*.svg')
        .pipe(svgmin(function (file) {
            var prefix = path.basename(file.relative, path.extname(file.relative));
            return {
                plugins: [{
                    cleanupIDs: {
                        prefix: prefix + '-',
                        minify: true
                    }
                }]
            }
        }))
        .pipe(svgstore({inlineSvg: true}));

    function fileContents (filePath, file) {
        return file.contents.toString();
    }

    return gulp
        .src('*.html')
        .pipe(inject(svgs, { transform: fileContents }))
        .pipe(gulp.dest('./'));

});


gulp.task('sass', function () {
    gulp.src('sass/**/*')
        .pipe(sourcemaps.init())
        .pipe(plumber())
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(concat('styles.css'))
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest('css'));
});

gulp.task('deploy-dev', function() {
    console.log(gulpftp);
    var conn = ftp.create( {
        host:     gulpftp.config.host,
        user:     gulpftp.config.user,
        password: gulpftp.config.pass,
        parallel: 3,
        log:      gutil.log
    } );

    /* list all files you wish to ftp in the glob variable */
    var globs = [
        '**/*',
        '*',
        '!node_modules/**',
        '!gulpconfig.js'
    ];

    // using base = '.' will transfer everything to /public_html correctly
    // turn off buffering in gulp.src for best performance

    return gulp.src( globs, { base: '.', buffer: false } )
        .pipe( conn.newer( 'website_directory/' ) ) // only upload newer files
        .pipe( conn.dest( 'website_directory/' ) )
        .pipe(notify("Dev site updated"));

} );

gulp.task('browser-sync', function() {
    browserSync.init(["css/*.css", "js/*.js", '*.html'], {
        server: {
            baseDir: "./"
        }
    });
});

gulp.task('imagemin', function () {
    return gulp.src(['images/**', '!images/{optimized,optimized/**}'])
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('images/optimized'));
});

var jsFiles = [
    "js/site.js",
    "!js/production.min.js"
];

gulp.task('minifyJs', function () {
    return gulp.src(jsFiles) //select all javascript files under js/ and any subdirectory
        .pipe(sourcemaps.init())
        .pipe(concat('production.min.js')) //the name of the resulting file
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('js/')) //the destination folder
        .pipe(notify({ message: 'Finished minifying app JavaScript'}));
});

gulp.task('default', ['browser-sync'], function () {
    gulp.watch("sass/*/*.scss", ['sass']);
    gulp.watch(["js/*", "!js/production.min.js", "!js/production.min.js.map"], ['minifyJs']); // minify JS when JS changes
    gulp.watch(["images/*", '!images/{optimized,optimized/**}'], ['imagemin']); // optimize images when images change
});