import {
  Descriptor,
  LinkType,
  Locator,
  MinimalResolveOptions,
  Package,
  ResolveOptions,
  Resolver,
  structUtils,
} from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'

export class StaticASTGrepResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions) {
    if (!descriptor.range.startsWith(`static-ast-grep:`)) return false

    return true
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions) {
    if (!locator.reference.startsWith(`static-ast-grep:`)) return false

    return true
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions) {
    return false
  }

  bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions) {
    return descriptor
  }

  getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions) {
    return {}
  }

  async getCandidates(descriptor: Descriptor, dependencies: unknown, opts: ResolveOptions) {
    if (!opts.fetchOptions)
      throw new Error(`Assertion failed: This resolver cannot be used unless a fetcher is configured`)

    return [structUtils.makeLocator(structUtils.parseIdent(`@ast-grep/cli`), descriptor.range)]
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Array<Locator>,
    opts: ResolveOptions,
  ) {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts)

    return {
      locators: locators.filter(candidate => candidate.locatorHash === locator.locatorHash),
      sorted: false,
    }
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const originalVersion = extract(locator.reference)

    if (!originalVersion) {
      throw new Error(`Could not extract version from ${locator.reference}`)
    }

    // Resolve the _real_ package, and pass through those dependencies
    const original = await opts.resolver.resolve(structUtils.parseLocator(`@ast-grep/cli@${originalVersion}`), opts)

    const bin = new Map(original.bin.entries())

    // On windows, rewrite the bin entries to be .exe
    if (process.platform === 'win32') {
      for (const [key, path] of bin.entries()) {
        bin.set(key, `${path}.exe` as PortablePath)
      }
    }

    return {
      ...locator,

      version: `*`,

      languageName: opts.project.configuration.get(`defaultLanguageName`),
      linkType: LinkType.HARD,

      // Pass through real dependencies
      dependencies: original.dependencies,
      peerDependencies: original.peerDependencies,

      dependenciesMeta: original.dependenciesMeta,
      peerDependenciesMeta: original.peerDependenciesMeta,

      bin,
    }
  }
}

function extract(input: string): string | null {
  const match = input.match(/<([^>]+)>/)

  if (!match) return null

  const content = match[1]

  // Remove 'npm%3A' prefix if present
  return content.startsWith('npm%3A') ? `npm:${content.slice(6)}` : content
}
