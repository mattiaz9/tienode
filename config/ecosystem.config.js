module.exports = {
  apps: [{
    name: "tienode",
    script: "npm",
    args: "start",
    cwd: "./tienode",
    autorestart: true,
  }]
}
