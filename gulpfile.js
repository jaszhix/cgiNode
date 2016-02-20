var gulp = require('gulp');
var clear = require('clear');
var babel = require('gulp-babel');
var exec = require('child_process').exec;
gulp.task('build-cgiNode', () => {
  return gulp.src('./src/cgiNode.js')
    .pipe(babel({
      presets: ['es2015', 'react']
    }))
    .pipe(gulp.dest('./dist'));
});
gulp.task('copy-cgiNode', ['build-cgiNode'],function() {
  //del.sync(['./dist/cgiNode.js']);
  return gulp.src('./dist/cgiNode.js')
    .pipe(gulp.dest('/usr/lib/cgi-bin'));
});
gulp.task('chmod', ['copy-cgiNode'],function () {
    exec('chmod 755 /usr/lib/cgi-bin/cgiNode.js', function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });
});
gulp.task('watch', function() {
  gulp.watch('./src/**/*.{js,jsx,es6}', ['chmod']);
});
gulp.task('clear-terminal', function() {
  clear();
});
gulp.task('spawn-watch', ['clear-terminal'], function() {
 var spawnWatch = function() {
    var proc = require('child_process').spawn('gulp', ['watch'], {stdio: 'inherit'});
    proc.on('close', function (code) {
      spawnWatch();
    });
  };
  spawnWatch();
});
gulp.task('default', ['spawn-watch'], function() {});
