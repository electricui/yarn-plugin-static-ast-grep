import { Plugin } from '@yarnpkg/core'

import { afterAllInstalled } from './afterAllInstalled'
import { StaticASTGrepFetcher } from './fetcher'
import { reduceDependency } from './reduceDependency'
import { StaticASTGrepResolver } from './resolver'

const plugin: Plugin = {
  hooks: {
    reduceDependency,
    afterAllInstalled,
  },
  fetchers: [StaticASTGrepFetcher],
  resolvers: [StaticASTGrepResolver],
}

export default plugin
