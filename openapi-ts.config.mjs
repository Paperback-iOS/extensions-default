import path from 'node:path'
import { paperbackClientPlugin } from './src/paperback-openapi-client/plugin.js'

/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
  input:
    'https://raw.githubusercontent.com/gotson/komga/refs/heads/master/komga/docs/openapi.json', // sign up at app.heyapi.dev

  output: {
    path: 'src/Komga/sdk',
    tsConfigPath: path.join(import.meta.dirname, 'tsconfig.json'),
  },

  parser: {},
  plugins: [
    ...['@hey-api/typescript', '@hey-api/sdk'],
    paperbackClientPlugin(),
  ],
}
