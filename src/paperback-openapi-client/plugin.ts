import {
  type Client,
  clientDefaultConfig,
  clientDefaultMeta,
  clientPluginHandler,
  type DefinePlugin,
  definePluginConfig,
} from '@hey-api/openapi-ts'

type Config = Client.Config & {
  /**
   * Plugin name. Must be unique.
   */
  name: string
}

export type PaperbackClient = DefinePlugin<Config>

export const defaultConfig: PaperbackClient['Config'] = {
  ...clientDefaultMeta,
  config: clientDefaultConfig,
  handler: clientPluginHandler as PaperbackClient['Handler'],
  name: import.meta.filename,
}

/**
 * Type helper for `my-client` plugin, returns {@link Plugin.Config} object
 */
export const paperbackClientPlugin = definePluginConfig(defaultConfig)
