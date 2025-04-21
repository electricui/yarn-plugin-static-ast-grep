import { Locator, MessageName, Package, Project, StreamReport, structUtils } from '@yarnpkg/core'
import { CwdFS, Filename } from '@yarnpkg/fslib'

import { InstallOptions } from '@yarnpkg/core/lib/Project'
import { ppath } from '@yarnpkg/fslib'
import { getLibzipPromise, ZipOpenFS } from '@yarnpkg/libzip'
import { PassThrough } from 'stream'

export async function mutatePackage(pkg: Package, replacement: Package, project: Project, opts: InstallOptions) {
  const { packageLocation: nativePackageLocation, packageFs: nativePackageFs } = await initializePackageEnvironment(
    replacement,
    project,
  )
  const { packageLocation, packageFs } = await initializePackageEnvironment(pkg, project)

  let binary = process.platform === 'win32' ? 'ast-grep.exe' : 'ast-grep'
  let alternative = process.platform === 'win32' ? 'sg.exe' : 'sg'

  // Read the original
  const binContent = await nativePackageFs.readFilePromise(ppath.join(nativePackageLocation, binary as Filename))

  // Copy the binary, mark as executable
  await packageFs.writeFilePromise(ppath.join(packageLocation, binary as Filename), binContent)
  await packageFs.chmodPromise(ppath.join(packageLocation, binary as Filename), 0o755)

  // Copy the alternative, mark as executable
  await packageFs.writeFilePromise(ppath.join(packageLocation, alternative as Filename), binContent)
  await packageFs.chmodPromise(ppath.join(packageLocation, alternative as Filename), 0o755)

  opts.report.reportInfo(MessageName.UNNAMED, `Installed prebuild for @ast-grep/cli`)
}

async function initializePackageEnvironment(locator: Locator, project: Project) {
  const pkg = project.storedPackages.get(locator.locatorHash)
  if (!pkg)
    throw new Error(`Package for ${structUtils.prettyLocator(project.configuration, locator)} not found in the project`)

  return await ZipOpenFS.openPromise(
    async (zipOpenFs: ZipOpenFS) => {
      const configuration = project.configuration

      const linkers = project.configuration.getLinkers()
      const linkerOptions = { project, report: new StreamReport({ stdout: new PassThrough(), configuration }) }

      const linker = linkers.find(linker => linker.supportsPackage(pkg, linkerOptions))
      if (!linker)
        throw new Error(
          `The package ${structUtils.prettyLocator(
            project.configuration,
            pkg,
          )} isn't supported by any of the available linkers`,
        )

      const packageLocation = await linker.findPackageLocation(pkg, linkerOptions)
      const packageFs = new CwdFS(packageLocation, { baseFs: zipOpenFs })

      return { packageLocation, packageFs }
    },
    {
      libzip: await getLibzipPromise(),
    },
  )
}
