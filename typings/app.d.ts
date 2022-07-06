export { }

declare global {
  interface Project {
    name: string
    repo: string
    repoUrl?: string // used for comments
    branch: string
    pipeline: string[]
    options?: PM2Options
  }

  interface PM2Options {
    script: string
    args?: string | string[]
    cwd?: string
    env?: Record<string, string>
    watch?: boolean
    exec_mode?: "cluster" | "fork"
    instances?: number
    autorestart?: boolean
    max_memory_restart?: string
  }

  interface Pm2Env {
    /**
     * The working directory of the process.
     */
    pm_cwd?: string
    /**
     * The stdout log file path.
     */
    pm_out_log_path?: string
    /**
     * The stderr log file path.
     */
    pm_err_log_path?: string
    /**
     * The interpreter used.
     */
    exec_interpreter?: string
    /**
     * The uptime of the process.
     */
    pm_uptime?: number
    /**
     * The number of unstable restarts the process has been through.
     */
    unstable_restarts?: number
    restart_time?: number
    status?: ProcessStatus
    /**
     * The number of running instances.
     */
    instances?: number | 'max'
    /**
     * The path of the script being run in this process.
     */
    pm_exec_path?: string
  }

  type ProcessStatus = 'online' | 'stopping' | 'stopped' | 'launching' | 'errored' | 'one-launch-status'

}