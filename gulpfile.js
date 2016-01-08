var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var del = require('del');

var BUILD_DIR = 'build';

gulp.task('default', function () {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('all.js'))
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(BUILD_DIR));
});

gulp.task('clean', function () {
	return del([
		BUILD_DIR
	]);
});