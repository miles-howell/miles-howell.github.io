import terser from '@rollup/plugin-terser';

export default {
  input: 'assets/js/dist/theme.js',
  output: {
    file: 'assets/js/dist/theme.min.js',
    format: 'iife',
    sourcemap: true,
    plugins: [terser()]
  }
};