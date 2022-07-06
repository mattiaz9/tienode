import { simpleGit } from "simple-git"

export async function getBranchCommit(project: Project) {
  const git = simpleGit(project.repo)
  await git.init()

  return new Promise<string | null>((res, rej) => {
    git.branch({}, (err, result) => {
      if (err) {
        return rej(err)
      }
      if (project.branch in result.branches) {
        return res(result.branches[project.branch].commit)
      }
      return res(null)
    })
  })
}
