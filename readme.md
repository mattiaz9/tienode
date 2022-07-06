# TieNode

Run a simple pipeline after every git commit and restart the process using **pm2**.

## How to setup on the server

### 1. Clone the project

`cd /var/www` or you default webistes folder

`git clone git@github.com:mattiaz9/tienode.git`

### 2. Build the project

`cd tienode`

`(pnpm|npm|yarn) install`

`(pnpm|npm|yarn) build`

### 3. Change .env

- Rename `.env.example` in `.env`
- Change `POLL_INTERVAL`, `GITHUB_TOKEN`, `GITHUB_ALLOW_DEPLOYMENTS` and `GITHUB_ALLOW_COMMENTS` as you wish
- I suggest using a fake collaborator account for comments to get an email notifications

### 4. Setup the projects config

- Rename `config/projects.js.example` in `config/projects.js`
- Add all your projects configurations as shown in the example
- **Make sure each project names are different from each others**

### 5. Setup pm2 to start 'tienode' at every startup

`cp config/ecosystem.config.js ../ecosystem.config.js`

`cd ..`

If you haven't installed pm2 yet:

`sudo npm install -g pm2`

`pm2 start ecosystem.config.js`

`pm2 save`

`pm2 startup`

### 6. After updating the `config/projects.js`

`cd /var/www`

`pm2 restart ecosystem.config.js`