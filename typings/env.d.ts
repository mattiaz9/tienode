export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POLL_INTERVAL?: string
      GITHUB_TOKEN?: string
      GITHUB_ALLOW_DEPLOYMENTS?: string
      GITHUB_ALLOW_COMMENTS?: string
    }
  }
}
