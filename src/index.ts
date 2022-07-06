import fs from "fs"
import path from "path"
import process from "process"
import chalk from "chalk"
import dotenv from "dotenv"
import { GitWatcher } from "git-repo-watch"
import { exec } from "child_process"
import pm2 from "pm2"
import type { Proc } from "pm2"
import type { RepoResult } from "git-repo-watch"

import { sendGithubComment, startDeployment, updateDeployment } from "./github.js"

dotenv.config({
  path: fs.existsSync(path.resolve(".env")) ? path.resolve(".env") : undefined,
})

async function run() {
  const projects = (await import(path.resolve("config/projects.js"))).default as Project[]

  await connectPM2()

  for (const project of projects) {
    try {
      await restartProject(project)
    } catch (error: any) {
      console.log(chalk.red(`🚨 Cannot start project: ${project.name}, reason: ${error.message}`))

      // don't watch
      sendGithubComment(project, "error", `Cannot start: ${error.message}`)
      continue
    }

    const gw = new GitWatcher()

    gw.watch({
      path: project.repo,
      remote: "origin",
      branch: project.branch,
      poll: process.env.POLL_INTERVAL ? +process.env.POLL_INTERVAL : 10,
      strict: true,
    })

    gw.result$.subscribe((result: RepoResult) => {
      if (result.error) {
        console.log(chalk.red(`🚨 Error: ${result.error}`))

        gw.unwatch(result.config)
      } else if (result.changed === true) {
        console.log(chalk.green(`✨ New version for: ${project.name}`))
        runPipeline(project)
      }
    })
  }

  process.stdin.resume()
}

function connectPM2() {
  return new Promise<void>((res, rej) => {
    pm2.connect(err => {
      if (err) {
        console.log(chalk.red(`🚨 PM2 Error: ${err.message}`))
        return rej(err)
      }

      res()
    })
  })
}

function getProjectInfo(project: Project) {
  const projectPath = path.resolve(project.repo, project.options?.cwd ?? "/")

  return new Promise<Pm2Env | null>((res, rej) => {
    pm2.list((err, list) => {
      if (err) {
        return rej(err)
      }
      const app = list.find(app => app.pm2_env?.pm_cwd === projectPath)
      res(app?.pm2_env ?? null)
    })
  })
}

async function isAlreadyStarted(project: Project) {
  const appInfo = await getProjectInfo(project)
  return appInfo != null
}

function restartProject(project: Project) {
  return new Promise<void>(async (res, rej) => {
    function callback(err: Error, proc: Proc) {
      if (err) {
        return rej(err)
      }
      if (proc) {
        return res()
      }
    }

    if (await isAlreadyStarted(project)) {
      console.log(chalk.green(`✨ Restarting: ${project.name}`))

      pm2.restart(project.name, callback)
    } else {
      console.log(chalk.green(`✨ Starting: ${project.name}`))

      const cwd = path.resolve(project.repo, project.options?.cwd || "/")
      console.log(cwd)

      pm2.start(
        {
          name: project.name,
          ...(project.options ?? {}),
          cwd,
        },
        callback
      )
    }
  })
}

async function runPipeline(project: Project) {
  let deploymentId: number

  try {
    deploymentId = await startDeployment(project)
    deploymentId && (await updateDeployment(project, deploymentId, "in_progress"))

    await execAsync("git pull", project)
    for (const cmd of project.pipeline) {
      console.log(chalk.blueBright(`🔨 ${project.name}: running '${cmd}'`))

      await execAsync(cmd, project)
    }
    await restartProject(project)

    deploymentId && (await updateDeployment(project, deploymentId, "success"))
    await sendGithubComment(project, "success")
  } catch (error) {
    console.log(chalk.red(`🚨 Pipeline error for project '${project.name}', error: ${error.message}`))

    deploymentId && (await updateDeployment(project, deploymentId, "failure"))
    await sendGithubComment(project, "error", error.message)
  }
}

function execAsync(cmd: string, project: Project) {
  const cwd = path.resolve(project.repo)

  return new Promise<void>((res, rej) => {
    const process = exec(cmd, { cwd }, (error, stdout, stderr) => {
      if (error) {
        return rej(error)
      }
      if (stderr) {
        return rej(stderr)
      }
      if (stdout) {
        console.log(chalk.blueBright(`🔨 ${project.name}: ${stdout}`))
      }
      res()
    })
    process.stdout?.on("data", data => console.log(`${project.name}: ${data}`))
  })
}

run()
