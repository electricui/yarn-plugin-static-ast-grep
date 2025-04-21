import { Descriptor, Locator, MessageName, Project, ResolveOptions, Resolver, structUtils } from '@yarnpkg/core'

export const reduceDependency = async (
  dependency: Descriptor,
  project: Project,
  locator: Locator,
  initialDependency: Descriptor,
  extra: { resolver: Resolver; resolveOptions: ResolveOptions },
) => {
  if (dependency.scope === 'ast-grep' && dependency.name === `cli`) {
    const descriptor = structUtils.makeDescriptor(
      dependency,
      structUtils.makeRange({
        protocol: `static-ast-grep:`,
        source: structUtils.stringifyDescriptor(dependency),
        selector: `ast-grep-cli<${initialDependency.range}>`,
        params: null,
      }),
    )

    extra.resolveOptions.report.reportInfo(
      MessageName.UNNAMED,
      `Found @ast-grep/cli dependency in ${structUtils.stringifyLocator(locator)}, re-routing to static prebuild`,
    )

    return descriptor
  }

  return dependency
}
