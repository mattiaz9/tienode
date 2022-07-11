import process from "process"
import axios from "axios"
import chalk from "chalk"

import { getBranchCommit } from "./git.js"

function getRepoInfos(project: Project) {
  const regex = /^git@github\.com:(.+?)\/(.+?).git$/
  const matches = project.repoUrl.match(regex)

  if (!matches || matches.length !== 3) return null

  const [, owner, repo] = matches

  return { owner, repo }
}

export async function startDeployment(project: Project) {
  if (!Boolean(process.env.GITHUB_ALLOW_DEPLOYMENTS)) return null
  if (!process.env.GITHUB_TOKEN) return null
  if (!project.repoUrl) return null
  if (!project.repoUrl.startsWith("git@github.com:")) return null

  const { owner, repo } = getRepoInfos(project)

  // api request
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/deployments`

  try {
    const resp = await axios.post(
      endpoint,
      {
        ref: project.branch,
        environment: "production",
        description: "Deploy request from tienode",
        payload: {
          state: "in_progress",
        },
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    )
    return resp.data.id as number
  } catch (error) {
    console.log(chalk.red(`🚨 GitHub Deployment error for project '${project.name}', error: ${error.message}`))

    return null
  }
}

export async function updateDeployment(project: Project, id: number, state: "success" | "failure" | "in_progress") {
  if (!Boolean(process.env.GITHUB_ALLOW_DEPLOYMENTS)) return
  if (!process.env.GITHUB_TOKEN) return
  if (!project.repoUrl) return
  if (!project.repoUrl.startsWith("git@github.com:")) return

  const { owner, repo } = getRepoInfos(project)

  // api request
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/deployments/${id}/statuses`

  try {
    await axios.post(
      endpoint,
      {
        state,
        description: state === "success" ? "Successfull deployment" : "Failed deployment",
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    )
  } catch (error) {
    console.log(chalk.red(`🚨 GitHub Deployment error for project '${project.name}', error: ${error.message}`))
  }
}

export async function sendGithubComment(project: Project, type: "success" | "error", message?: string) {
  if (!Boolean(process.env.GITHUB_ALLOW_COMMENTS)) return
  if (!process.env.GITHUB_TOKEN) return
  if (!project.repoUrl) return
  if (!project.repoUrl.startsWith("git@github.com:")) return

  const { owner, repo } = getRepoInfos(project)

  let comment = type === "success" ? `✅ Deployed successfully '${project.name}'` : `🚨 Deploy error '${project.name}'`
  if (message) {
    comment += ":\n"
    comment += message
  }

  // fetch last commit
  const commitSha = await getBranchCommit(project)

  // api request
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}/comments`

  try {
    await axios.post(
      endpoint,
      {
        body: comment,
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    )
  } catch (error) {
    console.log(chalk.red(`🚨 Comment error for project '${project.name}', error: ${error.message}`))
  }
}
