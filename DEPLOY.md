# CI/CD Deployment Guide — GitHub Actions + Azure VM

---

## Step 1 — Create Azure VM

1. Go to portal.azure.com
2. Click Create a resource → Virtual Machine
3. Fill in:
   - Resource Group: discord-bot-rg
   - VM Name: discord-rag-bot
   - Image: Ubuntu Server 24.04 LTS
   - Size: B1s
   - Authentication: SSH public key
   - Username: azureuser
4. Under Inbound port rules → allow SSH (22)
5. Click Review + Create → Create
6. Download the .pem key file — do not lose this

---

## Step 2 — Setup the VM (one time only)

Connect to VM:
```
chmod 400 your-key.pem
ssh -i your-key.pem azureuser@YOUR_VM_IP
```

Install Node.js, Git and PM2:
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
```

Clone your repo:
```
git clone https://github.com/YOUR_USERNAME/discord-rag-bot.git
cd discord-rag-bot
npm install
```

Setup PM2 to auto start on reboot:
```
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
Copy and run the command that pm2 startup prints.

Exit the VM:
```
exit
```

---

## Step 3 — Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add each of these:

| Secret Name     | Value                        |
|-----------------|------------------------------|
| VM_HOST         | Your Azure VM public IP      |
| VM_USER         | azureuser                    |
| VM_SSH_KEY      | Full contents of your .pem file |
| DISCORD_TOKEN   | Your Discord bot token       |
| SUPABASE_URL    | Your Supabase URL            |
| SUPABASE_KEY    | Your Supabase key            |
| GEMINI_API_KEY  | Your Gemini API key          |

For VM_SSH_KEY — open the .pem file on your local machine, copy everything including:
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----

---

## Step 4 — Create GitHub Actions Workflow

In your project, create this folder and file:
```
.github/workflows/deploy.yml
```

Paste this content:
```yaml
name: Deploy QuickChat

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to Azure VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd ~/discord-rag-bot
            git pull origin main
            npm install
            cat > ecosystem.config.js << 'EOF'
            module.exports = {
                apps: [{
                    name: 'discord-rag-bot',
                    script: 'index.js',
                    restart_delay: 5000,
                    max_restarts: 10,
                    watch: false,
                    env: {
                        NODE_ENV: 'production',
                        DISCORD_TOKEN: '${{ secrets.DISCORD_TOKEN }}',
                        SUPABASE_URL: '${{ secrets.SUPABASE_URL }}',
                        SUPABASE_KEY: '${{ secrets.SUPABASE_KEY }}',
                        GEMINI_API_KEY: '${{ secrets.GEMINI_API_KEY }}'
                    }
                }]
            };
            EOF
            pm2 restart ecosystem.config.js --update-env
            pm2 save
```

---

## Step 5 — Push to GitHub

Commit and push your code:
```
git add .
git commit -m "add cicd workflow"
git push origin main
```

---

## Step 6 — Watch the Deployment

1. Go to your GitHub repo
2. Click the Actions tab
3. You will see the workflow running
4. Click on it to see live logs
5. Green checkmark = deployed successfully

---

## How it works after setup

Every time you push code to the main branch:

```
You push code to GitHub
        ↓
GitHub Actions triggers automatically
        ↓
Connects to your Azure VM via SSH
        ↓
Pulls latest code with git pull
        ↓
Runs npm install for any new packages
        ↓
Writes ecosystem.config.js with secrets
        ↓
Restarts bot with pm2 restart
        ↓
Bot is live with new code
```

Total deployment time: ~30 seconds

---

## Verify Deployment

SSH into VM and check:
```
ssh -i your-key.pem azureuser@YOUR_VM_IP
pm2 status
pm2 logs discord-rag-bot --lines 20
```

You should see:
```
Logged in as QuickChat#0914. Bot is ready.
Invite link: https://discord.com/oauth2/authorize?...
Health check server listening on port 3000.
```
