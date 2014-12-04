module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      all: [
        'index.js', 'src/**/*.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  var plugins = require('matchdep').filterDev('grunt-*');
  plugins.forEach(grunt.loadNpmTasks);

  grunt.registerTask('default', ['nice-package', 'deps-ok', 'jshint']);
};
