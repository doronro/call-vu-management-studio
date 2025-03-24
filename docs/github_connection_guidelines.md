# GitHub Connection Guidelines for Call-VU Management Studio

This document provides comprehensive instructions for connecting to and working with the Call-VU Management Studio GitHub repository.

## Repository Information

- **Repository URL**: https://github.com/doronro/call-vu-management-studio.git
- **Repository Owner**: doronro
- **Project Type**: React application for conversational health intake system

## Prerequisites

Before connecting to the repository, ensure you have the following:

1. **Git** installed on your local machine
   - Download from [git-scm.com](https://git-scm.com/downloads)
   - Verify installation with `git --version`

2. **Node.js (v18+)** and **npm** installed
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation with `node --version` and `npm --version`

3. **GitHub Account** with access permissions to the repository
   - Create an account at [github.com](https://github.com/) if you don't have one
   - Contact repository owner (doronro) to request access if needed

## Connection Methods

### Method 1: Clone with HTTPS (Recommended for most users)

1. Open a terminal or command prompt
2. Navigate to the directory where you want to store the project
3. Run the following command:
   ```bash
   git clone https://github.com/doronro/call-vu-management-studio.git
   ```
4. When prompted, enter your GitHub username and password or personal access token

### Method 2: Clone with SSH (Recommended for developers with SSH setup)

1. Ensure you have SSH keys set up with GitHub
   - Generate SSH keys: `ssh-keygen -t ed25519 -C "your_email@example.com"`
   - Add the public key to your GitHub account (Settings > SSH and GPG keys)
2. Clone the repository:
   ```bash
   git clone git@github.com:doronro/call-vu-management-studio.git
   ```

### Method 3: Clone with GitHub CLI

1. Install GitHub CLI from [cli.github.com](https://cli.github.com/)
2. Authenticate with `gh auth login`
3. Clone the repository:
   ```bash
   gh repo clone doronro/call-vu-management-studio
   ```

### Method 4: Using Personal Access Token (PAT)

If you're provided with a personal access token:

1. Clone the repository using the token:
   ```bash
   git clone https://[USERNAME]:[TOKEN]@github.com/doronro/call-vu-management-studio.git
   ```
   Replace `[USERNAME]` with your GitHub username and `[TOKEN]` with the provided token

## Working with the Repository

### Setting Up the Project

After cloning:

1. Navigate to the project directory:
   ```bash
   cd call-vu-management-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Common Git Operations

- **Check repository status**:
  ```bash
  git status
  ```

- **Pull latest changes**:
  ```bash
  git pull origin main
  ```

- **Create a new branch**:
  ```bash
  git checkout -b feature/your-feature-name
  ```

- **Add changes**:
  ```bash
  git add .
  ```

- **Commit changes**:
  ```bash
  git commit -m "Your descriptive commit message"
  ```

- **Push changes**:
  ```bash
  git push origin feature/your-feature-name
  ```

### Creating Pull Requests

1. Push your branch to GitHub
2. Go to the repository on GitHub
3. Click "Compare & pull request"
4. Add a title and description
5. Click "Create pull request"

## Troubleshooting

### Authentication Issues

- If you encounter authentication issues, ensure your credentials are correct
- For persistent issues, generate a new personal access token:
  1. Go to GitHub Settings > Developer settings > Personal access tokens
  2. Generate a new token with appropriate permissions
  3. Use the token in place of your password when prompted

### Connection Problems

- Check your internet connection
- Verify that you have the correct repository URL
- Ensure you have the necessary permissions to access the repository

### Project Setup Issues

- Make sure you have the correct Node.js version (v18+)
- Clear npm cache if you encounter dependency issues:
  ```bash
  npm cache clean --force
  ```
- Delete node_modules folder and package-lock.json, then run `npm install` again

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

## Contact Information

For repository access issues, contact the repository owner through GitHub or via the project's communication channels.
