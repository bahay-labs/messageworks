import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import dts from 'rollup-plugin-dts'

const config = [
  {
    input: './src/index.ts',
    output: [
      {
        file: 'dist/bundle.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'auto',
      },
      {
        file: 'dist/bundle.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/bundle.umd.js',
        format: 'umd',
        name: 'MessageWorks',
        sourcemap: true,
        exports: 'auto',
        globals: {
          uuid: 'uuid',
        },
      },
    ],
    external: ['uuid', 'worker_threads'],
    plugins: [resolve(), commonjs(), typescript({ tsconfig: './tsconfig.json' })],
  },

  {
    input: 'src/index.ts',
    output: {
      file: 'dist/types/index.d.ts',
      format: 'esm',
    },
    plugins: [
      dts(),
    ],
  },

]

export default config
