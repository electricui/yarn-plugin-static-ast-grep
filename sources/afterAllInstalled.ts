import { MessageName, Project, structUtils } from '@yarnpkg/core'

import { InstallOptions } from '@yarnpkg/core/lib/Project'
import { mutatePackage } from './mutation'

import { MUSL, family } from 'detect-libc'

async function getPackageName() {
  let parts: string[] = [process.platform, process.arch]
  if (process.platform === 'linux') {
    if ((await family()) === MUSL) {
      parts.push('musl')
    } else if (process.arch === 'arm') {
      parts.push('gnueabihf')
    } else {
      parts.push('gnu')
    }
  } else if (process.platform === 'win32') {
    parts.push('msvc')
  }

  return `cli-${parts.join('-')}`
}

function findReplacement(project: Project, cliName: string) {
  for (const pkg of project.storedPackages.values()) {
    if (pkg.scope === 'ast-grep' && pkg.name === cliName) {
      return pkg
    }
  }

  return null
}

async function findASTGrepBinaryAndPatch(project: Project, opts: InstallOptions) {
  const cliName = await getPackageName()

  const replacement = findReplacement(project, cliName)

  for (const pkg of project.storedPackages.values()) {
    if (pkg.scope === 'ast-grep' && pkg.name === 'cli') {
      if (!replacement) {
        opts.report.reportInfo(
          MessageName.UNNAMED,
          `Couldn't mutate @ast-grep/cli, couldn't find replacement @ast-grep/${cliName}`,
        )

        return
      }

      try {
        await mutatePackage(pkg, replacement, project, opts)
      } catch (e) {
        opts.report.reportInfo(
          MessageName.UNNAMED,
          `Couldn't mutate @ast-grep/cli for ${structUtils.stringifyLocator(pkg)}`,
        )

        console.error(e)
      }
    }
  }
}

export async function afterAllInstalled(project: Project, opts: InstallOptions) {
  await opts.report.startTimerPromise(`@ast-grep/cli installation`, async () => {
    // In the config file all native modules must already be unplugged

    // Find all @ast-grep/cli dependencies
    await findASTGrepBinaryAndPatch(project, opts)
  })
}
